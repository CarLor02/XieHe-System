import {ImageSize, MeasurementData, Point, VertebraAnnotation, CfhAnnotation} from '@/app/imaging/features/image-viewer/shared/types';
import {AnnotationBindings} from "@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding";
import {RefObject, useEffect} from "react";
import {
    getAnnotationTypeId,
} from "@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config";
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import {
    calculateMeasurementDataValue,
} from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import { createLogger } from '@/lib/logger';

const logger = createLogger('app.imaging.features.image.viewer.features.measurements.application.hooks.useLocalAnnotationsDataLoader');

export function useLocalAnnotationsDataLoader(
    imageId: string,
    imageNaturalSize: ImageSize,
    examType: string,
    setMeasurements: (measurements: MeasurementData[]) => void,
    standardDistance: number | null,
    setStandardDistance: (distance: number | null) => void,
    standardDistancePoints: Point[],
    setStandardDistancePoints: (distancePoints: Point[]) => void,
    setPointBindings: (pointBindings: AnnotationBindings) => void,
    dbAnnotationLoadedRef: RefObject<boolean>,
    calcMeasurementValue:(
        type: string,
        points: Point[],
        context: CalculationContext
    ) => string,
    getDescriptionForType: (type: string) => string,
    restorePersistedKeypointState: (input: {
        examType: string;
        measurements: MeasurementData[];
        vertebraeLayer: VertebraAnnotation[];
        cfhAnnotation: CfhAnnotation | null;
    }) => void,
) {
    // 从localStorage加载标注数据
    const loadAnnotationsFromLocalStorage = () => {
        // 若 DB 已成功加载标注数据，localStorage 仅作历史备份，不再覆盖
        if (dbAnnotationLoadedRef.current) {
            logger.debug('DB 标注数据已加载，跳过 localStorage');
            return;
        }
        try {
            const key = `annotations_${imageId}`;
            const jsonStr = localStorage.getItem(key);
            if (jsonStr) {
                const data = JSON.parse(jsonStr);

                // 先加载或设置标准距离（必须在加载measurements之前）
                let loadedStandardDistance = standardDistance;
                let loadedStandardDistancePoints = standardDistancePoints;

                if (
                    data.standardDistance &&
                    data.standardDistancePoints &&
                    data.standardDistancePoints.length === 2
                ) {
                    // 如果有保存的标准距离，加载它
                    const scaledStandardPoints: Point[] = data.standardDistancePoints.map(
                        (p: any) => ({
                            x:
                                p.x *
                                (imageNaturalSize
                                    ? imageNaturalSize.width /
                                    (data.imageWidth || imageNaturalSize.width)
                                    : 1),
                            y:
                                p.y *
                                (imageNaturalSize
                                    ? imageNaturalSize.height /
                                    (data.imageHeight || imageNaturalSize.height)
                                    : 1),
                        })
                    );
                    loadedStandardDistance = data.standardDistance;
                    loadedStandardDistancePoints = scaledStandardPoints;
                    setStandardDistance(data.standardDistance);
                    setStandardDistancePoints(scaledStandardPoints);
                    logger.debug(`已加载标准距离: ${data.standardDistance}mm`);
                } else if (imageNaturalSize) {
                    // 如果没有保存的标准距离，设置默认值：左上角(0,0)到(200,0)，标准距离100mm
                    const defaultPoints = [
                        { x: 0, y: 0 },
                        { x: 200, y: 0 },
                    ];
                    loadedStandardDistance = 100;
                    loadedStandardDistancePoints = defaultPoints;
                    setStandardDistance(100);
                    setStandardDistancePoints(defaultPoints);
                    logger.debug(
                        '未找到标准距离，已设置默认值: 100mm，标注点: (0,0)到(200,0)'
                    );
                }

                // 然后加载measurements（使用已加载的标准距离）
                let restoredMeasurements: MeasurementData[] = [];
                if (data.measurements && Array.isArray(data.measurements)) {
                    // 检查是否需要坐标转换
                    const storedImageWidth = data.imageWidth;
                    const storedImageHeight = data.imageHeight;
                    let scaleX = 1;
                    let scaleY = 1;

                    if (storedImageWidth && storedImageHeight && imageNaturalSize) {
                        scaleX = imageNaturalSize.width / storedImageWidth;
                        scaleY = imageNaturalSize.height / storedImageHeight;
                        logger.debug('从本地加载标注，坐标缩放比例:', {
                            storedSize: {
                                width: storedImageWidth,
                                height: storedImageHeight,
                            },
                            currentSize: imageNaturalSize,
                            scale: { scaleX, scaleY },
                        });
                    }

                    // 恢复measurements；优先使用保存的id（确保绑定引用有效），否则生成新id
                    restoredMeasurements = data.measurements.map((m: any) => {
                        // 转换坐标（如果需要）
                        const scaledPoints = m.points.map((p: any) => ({
                            x: p.x * scaleX,
                            y: p.y * scaleY,
                        }));

                        // 对于AI检测的标注，保留原来的value和description
                        const isAIDetection = m.type.startsWith('AI检测-');
                        const typeId = isAIDetection ? m.type : getAnnotationTypeId(m.type);

                        const restoredMeasurement: MeasurementData = {
                            id:
                                m.id ||
                                Date.now().toString() +
                                Math.random().toString(36).substring(2, 11),
                            type: typeId,
                            value: '',
                            points: scaledPoints,
                            description: isAIDetection
                                ? m.description || m.type
                                : getDescriptionForType(typeId),
                            upperVertebra: m.upperVertebra,
                            lowerVertebra: m.lowerVertebra,
                            apexVertebra: m.apexVertebra,
                            keypointSynced: m.keypointSynced,
                            avtMetadata: m.avtMetadata,
                        };
                        restoredMeasurement.value = isAIDetection
                            ? m.value || ''
                            : getAnnotationTypeId(typeId) === 'avt'
                              ? calculateMeasurementDataValue(
                                  restoredMeasurement,
                                  {
                                      standardDistance: loadedStandardDistance,
                                      standardDistancePoints: loadedStandardDistancePoints,
                                      imageNaturalSize,
                                  }
                              )
                              : calcMeasurementValue(typeId, scaledPoints, {
                                  standardDistance: loadedStandardDistance,
                                  standardDistancePoints: loadedStandardDistancePoints,
                                  imageNaturalSize,
                              });
                        return restoredMeasurement;
                    });
                    setMeasurements(restoredMeasurements);
                    logger.debug(`已从本地加载 ${restoredMeasurements.length} 个标注`);
                }
                // 与已恢复的 measurements ids 同步校验绑定配置
                // 无论曾设置过什么绑定（包括从 DB 加载的），都必须在此更新为与当前 measurements 匹配的版本
                if (data.measurements && Array.isArray(data.measurements)) {
                    const validIds = new Set<string>(
                        data.measurements.map((m: any) => m.id).filter(Boolean)
                    );
                    if (validIds.size > 0 && data.pointBindings) {
                        // localStorage 有 id 且有绑定数据：校验后设置
                        const validated = {
                            syncGroups: (data.pointBindings.syncGroups as any[])
                                .map((g: any) => ({
                                    ...g,
                                    members: g.members.filter((mbr: any) =>
                                        validIds.has(mbr.annotationId)
                                    ),
                                }))
                                .filter((g: any) => g.members.length >= 2),
                        };
                        setPointBindings(validated);
                    } else {
                        // 旧格式无 id 或无绑定数据：清空绑定，避免 DB 界面的旧绑定残留；useEffect 将自动重建 S1 绑定
                        setPointBindings({ syncGroups: [] });
                    }
                } else {
                    // localStorage 无 measurements 数据，同样清空绑定
                    setPointBindings({ syncGroups: [] });
                }
                // 恢复椎体角点层（image 坐标，无需缩放）
                const restoredVertebraeLayer =
                    data.vertebraeLayer && Array.isArray(data.vertebraeLayer)
                        ? data.vertebraeLayer
                        : [];
                if (restoredVertebraeLayer.length > 0) {
                    logger.debug(`从 localStorage 恢复了 ${data.vertebraeLayer.length} 节椎体角点`);
                }
                restorePersistedKeypointState({
                    examType,
                    measurements: restoredMeasurements,
                    vertebraeLayer: restoredVertebraeLayer,
                    cfhAnnotation: data.cfhAnnotation ?? null,
                });
            } else if (imageNaturalSize) {
                // 如果完全没有保存的数据，设置默认标准距离
                const defaultPoints = [
                    { x: 0, y: 0 },
                    { x: 200, y: 0 },
                ];
                setStandardDistance(100);
                setStandardDistancePoints(defaultPoints);
                logger.debug(
                    '未找到本地数据，已设置默认标准距离: 100mm，标注点: (0,0)到(200,0)'
                );
            }
        } catch (error) {
            logger.error('加载本地标注数据失败:', error);
            // 即使加载失败，也设置默认标准距离
            if (imageNaturalSize) {
                const defaultPoints = [
                    { x: 0, y: 0 },
                    { x: 200, y: 0 },
                ];
                setStandardDistance(100);
                setStandardDistancePoints(defaultPoints);
                logger.debug('加载失败，已设置默认标准距离: 100mm');
            }
        }
    };

    // 当图像尺寸确定后，自动加载标注数据
    useEffect(() => {
        if (imageNaturalSize) {
            logger.debug('图像尺寸已确定，加载标注数据:', imageNaturalSize);
            loadAnnotationsFromLocalStorage();
        }
    }, [examType, imageNaturalSize, imageId]);
}
