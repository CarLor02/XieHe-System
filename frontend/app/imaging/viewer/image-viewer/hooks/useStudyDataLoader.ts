import {RefObject, useEffect} from "react";
import {
    AnnotationDataV2,
    MeasurementData,
    MeasurementProjectionBinding,
    Point,
    VertebraAnnotation,
    CfhAnnotation,
} from "../types";
import {getImageFile} from "@/services/imageServices/imageFileService"
import {AnnotationBindings} from "@/app/imaging/viewer/image-viewer/domain/annotation-binding";
import {StudyData} from "@/app/imaging/viewer/image-viewer/types";
import {
    KeypointAnnotation,
    keypointsToCfhAnnotation,
} from "@/app/imaging/viewer/image-viewer/domain/keypoint-state";

function isAnnotationDataV2(value: unknown): value is AnnotationDataV2 {
    if (!value || typeof value !== 'object') return false;
    const data = value as Partial<AnnotationDataV2>;
    return data.version === 2 && data.schema === 'keypoints-only' && Array.isArray(data.keypoints);
}

export function useStudyDataLoader(
    imageId: string,
    setStudyData: (studyData: StudyData | null) => void,
    setStudyLoading: (isLoading: boolean) => void,
    setMeasurements: (measurements: MeasurementData[]) => void,
    setStandardDistance: (distance: number | null) => void,
    setStandardDistancePoints: (distancePoints: Point[]) => void,
    setPointBindings: (pointBindings: AnnotationBindings) => void,
    dbAnnotationLoadedRef: RefObject<boolean>,
    setVertebraeLayer?: (layer: VertebraAnnotation[]) => void,
    setCfhAnnotation?: (cfh: CfhAnnotation | null) => void,
    setKeypoints?: (keypoints: KeypointAnnotation[]) => void,
    setMeasurementBindings?: (bindings: MeasurementProjectionBinding[]) => void,
    setSuppressedMeasurementIds?: (ids: string[]) => void,
) {
    // 从API获取真实的影像数据
    async function fetchStudyData() {
        try {
            setStudyLoading(true);
            // 直接使用imageId作为image_files表的ID
            const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
            const imageFile = await getImageFile(Number(numericId));

            // 将ImageFile数据转换为StudyData格式
            const studyData: StudyData = {
                id: imageFile.id,
                study_id: imageFile.file_uuid,
                patient_id: imageFile.patient_id || 0,
                patient_name: imageFile.uploader_name || '未知用户',
                study_date: imageFile.study_date || imageFile.created_at,
                study_description: imageFile.description || imageFile.file_type,
                modality: imageFile.modality || 'OTHER',
                status: imageFile.status,
                created_at: imageFile.created_at,
            }
            setStudyData(studyData);

            // 加载标注数据
            if (imageFile.annotation) {
                try {
                    const annotationData = JSON.parse(imageFile.annotation);
                    if (!isAnnotationDataV2(annotationData)) {
                        console.warn('忽略旧版标注数据：当前前端仅加载 V2 keypoints-only 结构');
                        return;
                    }

                    const keypoints = annotationData.keypoints as KeypointAnnotation[];
                    setKeypoints?.(keypoints);
                    setMeasurements(
                        Array.isArray(annotationData.auxiliaryAnnotations)
                            ? annotationData.auxiliaryAnnotations as MeasurementData[]
                            : []
                    );
                    setMeasurementBindings?.(
                        Array.isArray(annotationData.measurementBindings)
                            ? annotationData.measurementBindings
                            : []
                    );
                    setSuppressedMeasurementIds?.(
                        Array.isArray(annotationData.suppressedMeasurementIds)
                            ? annotationData.suppressedMeasurementIds
                            : []
                    );
                    setCfhAnnotation?.(keypointsToCfhAnnotation(keypoints));
                    setVertebraeLayer?.([]);
                    setPointBindings({syncGroups: []});
                    dbAnnotationLoadedRef.current = true;
                    console.log(
                        `从数据库加载了 ${keypoints.length} 个关键点和 ${annotationData.auxiliaryAnnotations?.length ?? 0} 个辅助标注`
                    );

                    if (annotationData.standardDistance) {
                        setStandardDistance(annotationData.standardDistance);
                    }
                    if (annotationData.standardDistancePoints) {
                        setStandardDistancePoints(annotationData.standardDistancePoints);
                    }
                } catch (e) {
                    console.error('解析标注数据失败:', e);
                }
            }
        } catch (error) {
            console.error('获取影像数据失败:', error);
            // 如果API失败，使用默认数据 TODO 是不是应该弹报错. 填充假数据合理吗?
            const studyData: StudyData = {
                id: parseInt(imageId.replace('IMG', '').replace(/^0+/, '') || '0'),
                study_id: imageId,
                patient_id: 0,
                patient_name: '未知患者',
                study_date: new Date().toISOString().split('T')[0],
                study_description: '未知检查',
                modality: 'XR',
                status: 'COMPLETED',
                created_at: new Date().toISOString(),
            }
            setStudyData(studyData);
        } finally {
            setStudyLoading(false);
        }
    }

    useEffect(
        ()=> {
            void fetchStudyData()
        },
        [imageId]
    );
}
