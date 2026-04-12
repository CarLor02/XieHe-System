import { useCallback, useState } from 'react';
import { Measurement } from '../../../types';

interface UseCanvasOverlayStateOptions {
  measurements: Measurement[];
  hiddenMeasurementIds: Set<string>;
  setHiddenMeasurementIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  hiddenAnnotationIds: Set<string>;
  setHiddenAnnotationIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

/**
 * 画布显示控制状态。
 * 收口结果面板显隐、标签显隐、标注显隐以及标准距离显隐，并统一同步个体隐藏集合。
 */
export function useCanvasOverlayState({
  measurements,
  hiddenMeasurementIds,
  setHiddenMeasurementIds,
  hiddenAnnotationIds,
  setHiddenAnnotationIds,
}: UseCanvasOverlayStateOptions) {
  const [showResults, setShowResults] = useState(true);
  const [hideAllLabels, setHideAllLabels] = useState(false);
  const [hideAllAnnotations, setHideAllAnnotations] = useState(false);
  const [isStandardDistanceHidden, setIsStandardDistanceHidden] =
    useState(false);

  const toggleResults = useCallback(() => {
    setShowResults(previous => !previous);
  }, []);

  const toggleAllAnnotations = useCallback(() => {
    const nextHidden = !hideAllAnnotations;
    setHideAllAnnotations(nextHidden);
    setHiddenAnnotationIds(
      nextHidden ? new Set(measurements.map(measurement => measurement.id)) : new Set()
    );
    setIsStandardDistanceHidden(nextHidden);
  }, [
    hideAllAnnotations,
    measurements,
    setHiddenAnnotationIds,
  ]);

  const toggleAllLabels = useCallback(() => {
    const nextHidden = !hideAllLabels;
    setHideAllLabels(nextHidden);
    setHiddenMeasurementIds(
      nextHidden ? new Set(measurements.map(measurement => measurement.id)) : new Set()
    );
  }, [hideAllLabels, measurements, setHiddenMeasurementIds]);

  const toggleMeasurementAnnotation = useCallback(
    (measurementId: string) => {
      const nextHidden = new Set(hiddenAnnotationIds);
      if (nextHidden.has(measurementId)) {
        nextHidden.delete(measurementId);
      } else {
        nextHidden.add(measurementId);
      }
      setHiddenAnnotationIds(nextHidden);
      setHideAllAnnotations(
        measurements.length > 0 &&
          measurements.every(measurement => nextHidden.has(measurement.id))
      );
    },
    [hiddenAnnotationIds, measurements, setHiddenAnnotationIds]
  );

  const toggleMeasurementLabel = useCallback(
    (measurementId: string) => {
      const nextHidden = new Set(hiddenMeasurementIds);
      if (nextHidden.has(measurementId)) {
        nextHidden.delete(measurementId);
      } else {
        nextHidden.add(measurementId);
      }
      setHiddenMeasurementIds(nextHidden);
      setHideAllLabels(
        measurements.length > 0 &&
          measurements.every(measurement => nextHidden.has(measurement.id))
      );
    },
    [hiddenMeasurementIds, measurements, setHiddenMeasurementIds]
  );

  const toggleStandardDistanceVisibility = useCallback(() => {
    const nextHidden = !isStandardDistanceHidden;
    setIsStandardDistanceHidden(nextHidden);
    setHideAllAnnotations(
      nextHidden &&
        measurements.length > 0 &&
        measurements.every(measurement => hiddenAnnotationIds.has(measurement.id))
    );
  }, [hiddenAnnotationIds, isStandardDistanceHidden, measurements]);

  const removeMeasurementVisibility = useCallback(
    (measurementId: string) => {
      setHiddenMeasurementIds(previous => {
        const next = new Set(previous);
        next.delete(measurementId);
        return next;
      });
      setHiddenAnnotationIds(previous => {
        const next = new Set(previous);
        next.delete(measurementId);
        return next;
      });
    },
    [setHiddenAnnotationIds, setHiddenMeasurementIds]
  );

  return {
    showResults,
    hideAllLabels,
    hideAllAnnotations,
    isStandardDistanceHidden,
    toggleResults,
    toggleAllAnnotations,
    toggleAllLabels,
    toggleMeasurementAnnotation,
    toggleMeasurementLabel,
    toggleStandardDistanceVisibility,
    removeMeasurementVisibility,
  };
}

