import { RefObject, useEffect } from 'react';
import {
  Point,
  MeasurementData,
  VertebraAnnotation,
  CfhAnnotation,
} from '@xiehe/imaging-core/contracts';
import { decodeAnnotationDocument } from '@xiehe/imaging-core/annotation-document';
import { getImageFile } from '@/services/imageServices/imageFileService';
import {
  AnnotationBindings,
  createEmptyBindings,
} from '@xiehe/imaging-core/bindings';
import { migrateAnnotationBindings } from '@xiehe/imaging-core/bindings';
import { StudyData } from '@/app/imaging/features/image-viewer/shared/types';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { createLogger } from '@/lib/logger';

const logger = createLogger(
  'app.imaging.features.image.viewer.features.study.hooks.useStudyDataLoader'
);

export function useStudyDataLoader(
  imageId: string,
  setStudyData: (studyData: StudyData | null) => void,
  setStudyLoading: (isLoading: boolean) => void,
  setAnnotationVersion: (version: number) => void,
  setMeasurements: (measurements: MeasurementData[]) => void,
  setStandardDistance: (distance: number | null) => void,
  setStandardDistancePoints: (distancePoints: Point[]) => void,
  setPointBindings: (pointBindings: AnnotationBindings) => void,
  dbAnnotationLoadedRef: RefObject<boolean>,
  restorePersistedKeypointState: (input: {
    examType: string;
    measurements: MeasurementData[];
    vertebraeLayer: VertebraAnnotation[];
    cfhAnnotation: CfhAnnotation | null;
  }) => void
) {
  // 从API获取真实的影像数据
  async function fetchStudyData() {
    try {
      setStudyLoading(true);
      // 直接使用imageId作为image_files表的ID
      const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
      const imageFile = await getImageFile(Number(numericId));
      setAnnotationVersion(imageFile.annotation_version);
      // 每次切换影像先清空上一张图的手动绑定；有标注数据时再通过
      // 统一迁移入口恢复，避免无 annotation 的影像继承旧状态。
      setPointBindings(createEmptyBindings());

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
      };
      setStudyData(studyData);

      // 加载标注数据
      if (imageFile.annotation) {
        try {
          const annotationData = decodeAnnotationDocument(imageFile.annotation);
          if (!annotationData) {
            throw new Error('不支持的标注文档版本或标注数据格式无效');
          }
          let restoredMeasurements: MeasurementData[] = [];
          if (Array.isArray(annotationData.measurements)) {
            restoredMeasurements = annotationData.measurements.map(
              measurement => ({
                ...measurement,
                type: getAnnotationTypeId(measurement.type),
              })
            );
            setMeasurements(restoredMeasurements);
            // 标记 DB 数据已加载，阻止 localStorage 后续覆盖
            dbAnnotationLoadedRef.current = true;
            logger.debug(
              `从数据库加载了 ${annotationData.measurements.length} 个标注`
            );
          }
          if (annotationData.standardDistance) {
            setStandardDistance(annotationData.standardDistance);
          }
          if (annotationData.standardDistancePoints) {
            setStandardDistancePoints(annotationData.standardDistancePoints);
          }
          setPointBindings(
            migrateAnnotationBindings(
              annotationData.pointBindings,
              restoredMeasurements
            )
          );
          const restoredVertebraeLayer =
            annotationData.vertebraeLayer &&
            Array.isArray(annotationData.vertebraeLayer)
              ? annotationData.vertebraeLayer
              : [];
          if (restoredVertebraeLayer.length > 0) {
            logger.debug(
              `从数据库恢复了 ${restoredVertebraeLayer.length} 节椎体角点`
            );
          }
          restorePersistedKeypointState({
            examType: studyData.study_description || studyData.modality,
            measurements: restoredMeasurements,
            vertebraeLayer: restoredVertebraeLayer,
            cfhAnnotation: annotationData.cfhAnnotation ?? null,
          });
        } catch (e) {
          logger.error('解析标注数据失败:', e);
        }
      }
    } catch (error) {
      logger.error('获取影像数据失败:', error);
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
      };
      setStudyData(studyData);
    } finally {
      setStudyLoading(false);
    }
  }

  useEffect(() => {
    void fetchStudyData();
  }, [imageId]);
}
