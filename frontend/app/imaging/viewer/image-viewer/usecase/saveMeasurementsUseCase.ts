import {
    AnnotationDataV2,
    MeasurementData,
    MeasurementProjectionBinding,
    StudyData,
    Point,
    ImageSize,
} from "../types";
import {updateImageAnnotation} from '@/services/imageServices';
import type {KeypointAnnotation} from "../domain/keypoint-state";

export async function saveMeasurements(
    imageId: string,
    studyData: StudyData | null,
    imageNaturalSize: ImageSize | null,
    standardDistance: number | null,
    standardDistancePoints: Point[] | null,
    keypoints: KeypointAnnotation[],
    auxiliaryAnnotations: MeasurementData[],
    measurementBindings: MeasurementProjectionBinding[],
    suppressedMeasurementIds: string[],
    reportText: string,
    setIsSaving: (state :boolean) => void,
    setSaveMessage: (message :string) => void,
){
    const hasStandardDistance =
        standardDistance !== null &&
        Array.isArray(standardDistancePoints) &&
        standardDistancePoints.length === 2;
    if (
        keypoints.length === 0 &&
        auxiliaryAnnotations.length === 0 &&
        !hasStandardDistance
    ) {
        setSaveMessage('暂无标注数据需要保存');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
    }

    setIsSaving(true);
    setSaveMessage('');
    const imageData = studyData
        ? {
            id: imageId,
            patientName: studyData.patient_name,
            patientId: studyData.patient_id ? studyData.patient_id.toString() : '0',
            examType: studyData.study_description || studyData.modality,
            studyDate: studyData.study_date,
            captureTime: studyData.created_at,
            seriesCount: 120,
            status: 'pending' as const,
        }
        : {
            id: imageId,
            patientName: '加载中...',
            patientId: '...',
            examType: '加载中...',
            studyDate: '...',
            captureTime: '...',
            seriesCount: 0,
            status: 'pending' as const,
        };
    try {
        const savedAt = new Date().toISOString();
        const annotationData: AnnotationDataV2 = {
            version: 2,
            schema: 'keypoints-only',
            imageId,
            examType: imageData.examType,
            keypoints,
            auxiliaryAnnotations,
            measurementBindings,
            suppressedMeasurementIds,
            standardDistance,
            standardDistancePoints: standardDistancePoints ?? [],
            imageWidth: imageNaturalSize?.width,
            imageHeight: imageNaturalSize?.height,
            reportText,
            savedAt,
        };

        // 1. 先保存到本地存储
        const key = `annotations_${imageId}`;
        localStorage.setItem(key, JSON.stringify(annotationData, null, 2));
        console.log(
            `已保存 ${keypoints.length} 个关键点和 ${auxiliaryAnnotations.length} 个辅助标注到本地`
        );

        // 2. 保存到服务器 image-files.annotation。医学测量项由关键点运行时推导，不再写 measurements 表。
        // 转换 imageId 为纯数字格式（去掉 IMG 前缀和前导零）
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
        try {
            await updateImageAnnotation(Number(numericId), JSON.stringify(annotationData));
            console.log('关键点标注数据已同步至 annotation 字段');
            setSaveMessage('标注已保存');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (annotationErr) {
            console.warn(
                '更新 annotation 字段失败（不影响主保存）:',
                annotationErr
            );
            setSaveMessage('标注已保存到本地，服务器同步失败');
            setTimeout(() => setSaveMessage(''), 3000);
        }
    } catch (error: any) {
        console.error('保存测量数据失败:', error);
        const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            error.message ||
            '保存失败，请重试';
        setSaveMessage(`保存失败: ${errorMessage}`);
        setTimeout(() => setSaveMessage(''), 5000);
    } finally {
        setIsSaving(false);
    }
}
