import {apiClient} from "@/lib/api";
import {MeasurementData, StudyData} from "@/app/imaging/viewer/image-viewer/types";
import {Point} from "fabric";
import {AnnotationBindings} from "@/app/imaging/viewer/image-viewer/domain/annotation-binding";

// TODO 没做完, 需要接入  service
export async function saveMeasurements(
    imageId: string,
    studyData: StudyData,
    imageNaturalSize: {width: number, height: number} | null,
    standardDistance: number,
    standardDistancePoints: Point[],
    pointBindings:AnnotationBindings,
    measurements: MeasurementData[],
    reportText: string,
    setIsSaving: (state :boolean) => void,
    setSaveMessage: (message :string) => void
){
    if (measurements.length === 0) {
        setSaveMessage('暂无测量数据需要保存');
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
        // 1. 先保存到本地存储
        const key = `annotations_${imageId}`;
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
                // 其他标注：保存id, type和points（value和description可以重新计算）
                return {
                    id: m.id,
                    type: m.type,
                    points: m.points,
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
            pointBindings: pointBindings,
        };
        localStorage.setItem(key, JSON.stringify(localData, null, 2));
        console.log(
            `已保存 ${measurements.length} 个标注到本地，标准距离: ${standardDistance}mm`
        );

        // 2. 保存到服务器
        // 转换 imageId 为纯数字格式（去掉 IMG 前缀和前导零）
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
        const measurementData = {
            imageId: numericId,
            patientId: imageData.patientId,
            examType: imageData.examType,
            measurements: measurements,
            reportText: reportText,
            savedAt: new Date().toISOString(),
        };

        const response = await apiClient.post(
            `/api/v1/measurements/${numericId}`,
            measurementData
        );

        console.log('保存响应:', response.status);

        if (response.status === 200) {
            setSaveMessage('标注已保存到本地和服务器');
            setTimeout(() => setSaveMessage(''), 3000);
        } else {
            const errorMsg =
                response.data?.message || response.data?.detail || '保存失败';
            console.error('保存失败:', response.status, errorMsg);
            throw new Error(errorMsg);
        }

        // 3. 同时更新 image-files 的 annotation 字段，持久化绑定数据
        try {
            const annotationData = {
                measurements: measurements,
                standardDistance: standardDistance,
                standardDistancePoints: standardDistancePoints,
                pointBindings: pointBindings,
                imageWidth: imageNaturalSize?.width,
                imageHeight: imageNaturalSize?.height,
                savedAt: new Date().toISOString(),
            };
            await apiClient.patch(`/api/v1/image-files/${numericId}/annotation`, {
                annotation: JSON.stringify(annotationData),
            });
            console.log('绑定数据已同步至 annotation 字段');
        } catch (annotationErr) {
            // 不阻断主保存流程
            console.warn(
                '更新 annotation 字段失败（不影响主保存）:',
                annotationErr
            );
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
};