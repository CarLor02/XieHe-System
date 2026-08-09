import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import {
  deleteKeypoints,
  type KeypointAnnotation,
  keypointsToCfhAnnotation,
  keypointsToPersistedLayer,
} from '@xiehe/imaging-core/keypoints';
import { renumberCobbMeasurementsAfterDelete } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/renumberCobbMeasurementsAfterDelete';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import {
  planKeypointDeletion,
  planMeasurementDeletion,
  type AnnotationDeletionPlan,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/deletion';
import { isCobbMeasurement } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-keypoint-query';
import type {
  CfhAnnotation,
  MeasurementData,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';

interface UseAnnotationDeletionWorkflowOptions {
  examType: string;
  measurements: MeasurementData[];
  setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>;
  keypoints: KeypointAnnotation[];
  setKeypoints: Dispatch<SetStateAction<KeypointAnnotation[]>>;
  setVertebraeLayer: Dispatch<SetStateAction<VertebraAnnotation[]>>;
  isLateralView: boolean;
  setCfhAnnotation: Dispatch<SetStateAction<CfhAnnotation | null>>;
  calculationContext: CalculationContext;
  aiMeasurementIdsRef: MutableRefObject<Set<string>>;
}

export function useAnnotationDeletionWorkflow({
  examType,
  measurements,
  setMeasurements,
  keypoints,
  setKeypoints,
  setVertebraeLayer,
  isLateralView,
  setCfhAnnotation,
  calculationContext,
  aiMeasurementIdsRef,
}: UseAnnotationDeletionWorkflowOptions) {
  const applyDeletionPlan = useCallback(
    (plan: AnnotationDeletionPlan) => {
      const measurementIds = new Set(plan.measurementIdsToDelete);
      const removedMeasurements = measurements.filter(measurement =>
        measurementIds.has(measurement.id)
      );
      const shouldRenumberCobb = removedMeasurements.some(isCobbMeasurement);
      const retainedMeasurements = measurements.filter(
        measurement => !measurementIds.has(measurement.id)
      );
      const nextMeasurements = shouldRenumberCobb
        ? renumberCobbMeasurementsAfterDelete(
            retainedMeasurements,
            calculationContext
          )
        : retainedMeasurements;
      const nextKeypoints = deleteKeypoints(
        keypoints,
        plan.keypointIdsToDelete
      );

      plan.measurementIdsToDelete.forEach(measurementId => {
        aiMeasurementIdsRef.current.delete(measurementId);
      });
      setMeasurements(nextMeasurements);
      setKeypoints(nextKeypoints);
      setVertebraeLayer(keypointsToPersistedLayer(nextKeypoints));
      if (isLateralView) {
        setCfhAnnotation(keypointsToCfhAnnotation(nextKeypoints));
      }

      return {
        removedMeasurementCount: removedMeasurements.length,
        removedKeypointCount: keypoints.length - nextKeypoints.length,
      };
    },
    [
      aiMeasurementIdsRef,
      calculationContext,
      isLateralView,
      keypoints,
      measurements,
      setCfhAnnotation,
      setKeypoints,
      setMeasurements,
      setVertebraeLayer,
    ]
  );

  const deleteMeasurement = useCallback(
    (measurementId: string) =>
      applyDeletionPlan(
        planMeasurementDeletion(measurements, measurementId, examType)
      ),
    [applyDeletionPlan, examType, measurements]
  );

  const deleteSelectedKeypoints = useCallback(
    (keypointIds: readonly string[]) =>
      applyDeletionPlan(
        planKeypointDeletion(measurements, keypointIds, examType)
      ),
    [applyDeletionPlan, examType, measurements]
  );

  return { deleteMeasurement, deleteSelectedKeypoints };
}
