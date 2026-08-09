import {MeasurementData, Point, ImageSize, VertebraAnnotation, CfhAnnotation} from '@xiehe/imaging-core/contracts';
import {
    AnnotationBindings,
    validateAnnotationBindings,
} from "@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding";
import { saveImageAnnotation } from '@/services/imageServices';
import {saveLocalAnnotationBackup} from './localAnnotationStorage';
import { createLogger } from '@/lib/logger';

const logger = createLogger('app.imaging.features.image.viewer.features.measurements.application.usecases.saveMeasurementsUseCase');

export async function saveMeasurements(
    imageId: string,
    annotationVersion: number,
    onAnnotationVersionChange: (version: number) => void,
    imageNaturalSize: ImageSize | null,
    standardDistance: number | null,
    standardDistancePoints: Point[] | null,
    pointBindings:AnnotationBindings,
    measurements: MeasurementData[],
    reportText: string,
    setIsSaving: (state :boolean) => void,
    setSaveMessage: (message :string) => void,
    vertebraeLayer: VertebraAnnotation[] = [],
    cfhAnnotation: CfhAnnotation | null = null,
    onConflict?: (message: string) => void,
){
    const hasStandardDistance =
        standardDistance !== null &&
        Array.isArray(standardDistancePoints) &&
        standardDistancePoints.length === 2;
    const hasKeypointLayer = vertebraeLayer.length > 0 || cfhAnnotation !== null;
    const hasSavedAnnotationContent =
        measurements.length > 0 || hasKeypointLayer || hasStandardDistance;

    setIsSaving(true);
    setSaveMessage('');
    try {
        // 持久化边界再次过滤布局已失效的成员。自动医学同步关系不属于用户
        // 标注状态，只能由关键点依赖图重建，因此不会写入 pointBindings。
        const validatedPointBindings = validateAnnotationBindings(
            pointBindings,
            measurements
        );
        // 1. 先写本地维护缓存；失败不能阻断后续服务器保存。
        // 对于AI检测标注，需要保存value和description；其他标注只保存type和points
        // 同时保存id，确保加载时绑定数据中的annotationId引用仍然有效
        const simplifiedMeasurements = measurements.map(m => {
            const isAIDetection = m.type.startsWith('AI检测-');
            if (isAIDetection) {
                // AI检测标注：保存id, type, points, value, description
                return {
                    id: m.id,
                    type: m.type,
                    points: m.points,
                    value: m.value,
                    description: m.description,
                };
            } else {
                // 其他标注保留重建与业务绑定所需的 metadata；
                // 其中 AVT 的可变点布局不能仅靠 type + points 恢复。
                return {
                    id: m.id,
                    type: m.type,
                    points: m.points,
                    upperVertebra: m.upperVertebra,
                    lowerVertebra: m.lowerVertebra,
                    apexVertebra: m.apexVertebra,
                    keypointSynced: m.keypointSynced,
                    avtMetadata: m.avtMetadata,
                    pelvicMetadata: m.pelvicMetadata,
                };
            }
        });
        const localData = {
            imageId: imageId,
            imageWidth: imageNaturalSize?.width,
            imageHeight: imageNaturalSize?.height,
            measurements: simplifiedMeasurements,
            standardDistance: standardDistance,
            standardDistancePoints: standardDistancePoints,
            pointBindings: validatedPointBindings,
            vertebraeLayer: vertebraeLayer.length > 0 ? vertebraeLayer : undefined,
            cfhAnnotation: cfhAnnotation ?? undefined,
        };
        const localBackupResult = saveLocalAnnotationBackup(imageId, localData);
        if (localBackupResult.saved) {
            logger.debug(
                `已保存 ${measurements.length} 个标注到本地，标准距离: ${standardDistance}mm`
            );
        } else {
            logger.warn(
                '本地标注缓存保存失败，继续保存服务器:',
                localBackupResult.reason
            );
        }

        // 2. 保存到服务器
        // 转换 imageId 为纯数字格式（去掉 IMG 前缀和前导零）
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
        const annotationData = {
            measurements: measurements,
            standardDistance: standardDistance,
            standardDistancePoints: standardDistancePoints,
            pointBindings: validatedPointBindings,
            imageWidth: imageNaturalSize?.width,
            imageHeight: imageNaturalSize?.height,
            reportText,
            vertebraeLayer: vertebraeLayer.length > 0 ? vertebraeLayer : undefined,
            cfhAnnotation: cfhAnnotation ?? undefined,
        };
        const result = await saveImageAnnotation(
            Number(numericId),
            annotationVersion,
            annotationData
        );
        onAnnotationVersionChange(result.annotation_version);
        logger.debug(`标注快照已保存为版本 ${result.annotation_version}`);
        setSaveMessage(
            measurements.length > 0
                ? '标注已保存到本地和服务器'
                : hasSavedAnnotationContent
                    ? '关键点已保存到本地和影像标注'
                    : '空标注已保存到本地和影像标注'
        );
        setTimeout(() => setSaveMessage(''), 3000);
    } catch (error: any) {
        logger.error('保存测量数据失败:', error);
        const detail = error.response?.data?.detail;
        const errorMessage = typeof detail === 'object'
            ? detail?.message
            : error.response?.data?.message || detail || error.message || '保存失败，请重试';
        if (error.response?.status === 409) {
            onConflict?.(errorMessage);
        }
        setSaveMessage(`保存失败: ${errorMessage}`);
        setTimeout(() => setSaveMessage(''), 5000);
    } finally {
        setIsSaving(false);
    }
}
