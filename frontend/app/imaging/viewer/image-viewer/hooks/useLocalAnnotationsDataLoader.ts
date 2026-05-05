import {
    AnnotationDataV2,
    ImageSize,
    MeasurementData,
    MeasurementProjectionBinding,
    Point,
    VertebraAnnotation,
    CfhAnnotation,
} from "../types";
import {AnnotationBindings} from "@/app/imaging/viewer/image-viewer/domain/annotation-binding";
import {RefObject, useEffect} from "react";
import {
    KeypointAnnotation,
    keypointsToCfhAnnotation,
} from "@/app/imaging/viewer/image-viewer/domain/keypoint-state";

function isAnnotationDataV2(value: unknown): value is AnnotationDataV2 {
    if (!value || typeof value !== 'object') return false;
    const data = value as Partial<AnnotationDataV2>;
    return data.version === 2 && data.schema === 'keypoints-only' && Array.isArray(data.keypoints);
}

export function useLocalAnnotationsDataLoader(
    imageId: string,
    imageNaturalSize: ImageSize,
    setMeasurements: (measurements: MeasurementData[]) => void,
    standardDistance: number | null,
    setStandardDistance: (distance: number | null) => void,
    standardDistancePoints: Point[],
    setStandardDistancePoints: (distancePoints: Point[]) => void,
    setPointBindings: (pointBindings: AnnotationBindings) => void,
    dbAnnotationLoadedRef: RefObject<boolean>,
    _calcMeasurementValue: unknown,
    _getDescriptionForType: unknown,
    setVertebraeLayer?: (layer: VertebraAnnotation[]) => void,
    setCfhAnnotation?: (cfh: CfhAnnotation | null) => void,
    setKeypoints?: (keypoints: KeypointAnnotation[]) => void,
    setMeasurementBindings?: (bindings: MeasurementProjectionBinding[]) => void,
    setSuppressedMeasurementIds?: (ids: string[]) => void,
) {
    // 从localStorage加载标注数据
    const loadAnnotationsFromLocalStorage = () => {
        // 若 DB 已成功加载标注数据，localStorage 仅作历史备份，不再覆盖
        if (dbAnnotationLoadedRef.current) {
            console.log('DB 标注数据已加载，跳过 localStorage');
            return;
        }
        try {
            const key = `annotations_${imageId}`;
            const jsonStr = localStorage.getItem(key);
            if (jsonStr) {
                const data = JSON.parse(jsonStr);
                if (!isAnnotationDataV2(data)) {
                    console.warn('忽略旧版 localStorage 标注：当前前端仅加载 V2 keypoints-only 结构');
                    return;
                }

                // 先加载或设置标准距离（必须在加载measurements之前）
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
                    setStandardDistance(data.standardDistance);
                    setStandardDistancePoints(scaledStandardPoints);
                    console.log(`已加载标准距离: ${data.standardDistance}mm`);
                } else if (imageNaturalSize) {
                    // 如果没有保存的标准距离，设置默认值：左上角(0,0)到(200,0)，标准距离100mm
                    const defaultPoints = [
                        { x: 0, y: 0 },
                        { x: 200, y: 0 },
                    ];
                    setStandardDistance(100);
                    setStandardDistancePoints(defaultPoints);
                    console.log(
                        '未找到标准距离，已设置默认值: 100mm，标注点: (0,0)到(200,0)'
                    );
                }

                setMeasurements(
                    Array.isArray(data.auxiliaryAnnotations)
                        ? data.auxiliaryAnnotations as MeasurementData[]
                        : []
                );
                setKeypoints?.(data.keypoints as KeypointAnnotation[]);
                setMeasurementBindings?.(
                    Array.isArray(data.measurementBindings)
                        ? data.measurementBindings
                        : []
                );
                setSuppressedMeasurementIds?.(
                    Array.isArray(data.suppressedMeasurementIds)
                        ? data.suppressedMeasurementIds
                        : []
                );
                setPointBindings({ syncGroups: [] });
                setVertebraeLayer?.([]);
                setCfhAnnotation?.(keypointsToCfhAnnotation(data.keypoints as KeypointAnnotation[]));
                console.log(`已从本地加载 ${data.keypoints.length} 个关键点`);
            } else if (imageNaturalSize) {
                // 如果完全没有保存的数据，设置默认标准距离
                const defaultPoints = [
                    { x: 0, y: 0 },
                    { x: 200, y: 0 },
                ];
                setStandardDistance(100);
                setStandardDistancePoints(defaultPoints);
                console.log(
                    '未找到本地数据，已设置默认标准距离: 100mm，标注点: (0,0)到(200,0)'
                );
            }
        } catch (error) {
            console.error('加载本地标注数据失败:', error);
            // 即使加载失败，也设置默认标准距离
            if (imageNaturalSize) {
                const defaultPoints = [
                    { x: 0, y: 0 },
                    { x: 200, y: 0 },
                ];
                setStandardDistance(100);
                setStandardDistancePoints(defaultPoints);
                console.log('加载失败，已设置默认标准距离: 100mm');
            }
        }
    };

    // 当图像尺寸确定后，自动加载标注数据
    useEffect(() => {
        if (imageNaturalSize) {
            console.log('图像尺寸已确定，加载标注数据:', imageNaturalSize);
            loadAnnotationsFromLocalStorage();
        }
    }, [imageNaturalSize, imageId]);
}
