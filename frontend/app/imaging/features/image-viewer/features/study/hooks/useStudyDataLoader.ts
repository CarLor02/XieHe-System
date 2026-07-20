import {RefObject, useEffect} from "react";
import {Point, MeasurementData, AnnotationData, VertebraAnnotation, CfhAnnotation} from '@/app/imaging/features/image-viewer/shared/types';
import {getImageFile} from "@/services/imageServices/imageFileService"
import {AnnotationBindings} from "@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding";
import {StudyData} from "@/app/imaging/features/image-viewer/shared/types";
import {getAnnotationTypeId} from "@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config";

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
                patient_name: imageFile.patient_name || '患者不详',
                patient_identifier: imageFile.patient_identifier || null,
                patient_gender: imageFile.patient_gender || null,
                patient_age: imageFile.patient_age ?? null,
                study_date: imageFile.study_date || imageFile.created_at,
                study_description: imageFile.description || imageFile.file_type,
                modality: imageFile.file_type || 'OTHER',
                status: imageFile.status,
                created_at: imageFile.created_at,
            }
            setStudyData(studyData);

            // 加载标注数据
            if (imageFile.annotation) {
                try {
                    const annotationData = imageFile.annotation as unknown as AnnotationData; // TODO 以后看一下这里的校验能不能精准一些
                    if (
                        annotationData.measurements &&
                        Array.isArray(annotationData.measurements) // TODO 以后看下这里的校验能不能精准一些
                    ) {
                        setMeasurements(
                            (annotationData.measurements as MeasurementData[]).map(measurement => ({
                                ...measurement,
                                type: getAnnotationTypeId(measurement.type),
                            }))
                        );
                        // 标记 DB 数据已加载，阻止 localStorage 后续覆盖
                        dbAnnotationLoadedRef.current = true;
                        console.log(
                            `从数据库加载了 ${annotationData.measurements.length} 个标注`
                        );
                    }
                    if (annotationData.standardDistance) {
                        setStandardDistance(annotationData.standardDistance);
                    }
                    if (annotationData.standardDistancePoints) {
                        setStandardDistancePoints(annotationData.standardDistancePoints);
                    }
                    // 加载点绑定配置：同步校验成员 annotationId 是否存在于当前标注列表
                    if (annotationData.pointBindings && annotationData.measurements) {
                        const validIds = new Set<string>(
                            (annotationData.measurements as any[])
                                .map((m: any) => m.id)
                                .filter(Boolean)
                        );
                        const validated = {
                            syncGroups: (annotationData.pointBindings.syncGroups)
                                .map((g: any) => ({
                                    ...g,
                                    members: g.members.filter((mbr: any) =>
                                        validIds.has(mbr.annotationId)
                                    ),
                                }))
                                .filter((g: any) => g.members.length >= 2),
                        };
                        setPointBindings(validated);
                    }
                    // 恢复椎体角点层
                    if (annotationData.vertebraeLayer && Array.isArray(annotationData.vertebraeLayer) && annotationData.vertebraeLayer.length > 0) {
                        setVertebraeLayer?.(annotationData.vertebraeLayer);
                        console.log(`从数据库恢复了 ${annotationData.vertebraeLayer.length} 节椎体角点`);
                    }
                    if (annotationData.cfhAnnotation) {
                        setCfhAnnotation?.(annotationData.cfhAnnotation);
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
                patient_name: '患者不详',
                patient_identifier: null,
                patient_gender: null,
                patient_age: null,
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
