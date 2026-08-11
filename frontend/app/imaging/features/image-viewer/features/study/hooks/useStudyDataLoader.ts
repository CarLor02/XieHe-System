import { useEffect } from 'react';
import { getImageFile } from '@/services/imageServices/imageFileService';
import { getAnnotationTypeId } from '@xiehe/imaging-catalog/annotations';
import {
  prepareStudyEditorState,
  type StudyEditorData,
} from '@xiehe/imaging-core/editor';
import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import type { AnnotationBindings } from '@xiehe/imaging-core/bindings';
import type { HydratedKeypointState } from '@xiehe/imaging-core/measurement-keypoint-sync';
import { getApiErrorMessage } from '@xiehe/api-client';
import { createLogger } from '@/lib/logger';

const logger = createLogger(
  'app.imaging.features.image.viewer.features.study.hooks.useStudyDataLoader'
);

interface StudyDataLoaderOptions {
  imageId: string;
  reloadToken: number;
  setStudyData: (studyData: StudyEditorData | null) => void;
  setStudyLoading: (isLoading: boolean) => void;
  setStudyLoadError: (message: string | null) => void;
  setAnnotationVersion: (version: number) => void;
  setMeasurements: (measurements: MeasurementData[]) => void;
  setStandardDistance: (distance: number | null) => void;
  setStandardDistancePoints: (distancePoints: Point[]) => void;
  setPointBindings: (pointBindings: AnnotationBindings) => void;
  setReportText: (reportText: string) => void;
  applyHydratedKeypointState: (state: HydratedKeypointState) => void;
}

/** 服务端是编辑器标注的唯一加载来源；失败时保留错误态等待用户重试。 */
export function useStudyDataLoader({
  imageId,
  reloadToken,
  setStudyData,
  setStudyLoading,
  setStudyLoadError,
  setAnnotationVersion,
  setMeasurements,
  setStandardDistance,
  setStandardDistancePoints,
  setPointBindings,
  setReportText,
  applyHydratedKeypointState,
}: StudyDataLoaderOptions) {
  useEffect(() => {
    let cancelled = false;

    const fetchStudyData = async () => {
      setStudyLoading(true);
      setStudyLoadError(null);
      setStudyData(null);
      try {
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
        const imageFile = await getImageFile(Number(numericId));
        const prepared = prepareStudyEditorState({
          source: imageFile,
          normalizeMeasurementType: getAnnotationTypeId,
        });
        if (cancelled) return;

        setStudyData(prepared.study);
        setAnnotationVersion(prepared.annotationVersion);
        setMeasurements(prepared.measurements);
        setStandardDistance(prepared.standardDistance);
        setStandardDistancePoints(prepared.standardDistancePoints);
        setPointBindings(prepared.pointBindings);
        setReportText(prepared.reportText);
        applyHydratedKeypointState(prepared.keypointState);
        logger.debug(`从服务器加载了 ${prepared.measurements.length} 个标注`);
      } catch (error) {
        if (cancelled) return;
        logger.error('获取或解析影像数据失败:', error);
        setStudyLoadError(getApiErrorMessage(error, '影像数据加载失败，请重试'));
      } finally {
        if (!cancelled) setStudyLoading(false);
      }
    };

    void fetchStudyData();
    return () => {
      cancelled = true;
    };
  }, [
    applyHydratedKeypointState,
    imageId,
    reloadToken,
    setAnnotationVersion,
    setMeasurements,
    setPointBindings,
    setReportText,
    setStandardDistance,
    setStandardDistancePoints,
    setStudyData,
    setStudyLoadError,
    setStudyLoading,
  ]);
}
