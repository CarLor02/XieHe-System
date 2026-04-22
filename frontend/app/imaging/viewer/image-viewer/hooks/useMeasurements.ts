import { useState } from 'react';
import { MeasurementData, Point } from '../types';

/**
 * measurement 列表、报告文本、标准距离与辅助面板状态。
 */
export function useMeasurements() {
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [reportText, setReportText] = useState('');
  const [standardDistance, setStandardDistance] = useState<number | null>(null);
  const [standardDistanceValue, setStandardDistanceValue] = useState('');
  const [standardDistancePoints, setStandardDistancePoints] = useState<Point[]>([]);
  const [hoveredStandardPointIndex, setHoveredStandardPointIndex] = useState<number | null>(null);
  const [draggingStandardPointIndex, setDraggingStandardPointIndex] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [treatmentAdvice, setTreatmentAdvice] = useState('');
  const [showAdvicePanel, setShowAdvicePanel] = useState(false);

  const recalculateAVTandTS = (
    imageNaturalSize: { width: number; height: number } | null,
    newStandardDistance?: number,
    newStandardDistancePoints?: Point[]
  ) => {
    const distanceToUse =
      newStandardDistance !== undefined
        ? newStandardDistance
        : standardDistance;
    const pointsToUse =
      newStandardDistancePoints !== undefined
        ? newStandardDistancePoints
        : standardDistancePoints;

    setMeasurements(currentMeasurements =>
      currentMeasurements.map(measurement => {
        if (
          (measurement.type === 'AVT' ||
            measurement.type === 'TTS' ||
            measurement.type === 'SVA') &&
          measurement.points.length >= 2
        ) {
          const imageWidth = imageNaturalSize?.width || 1000;
          const referenceWidth = 300;
          const pixelDistance = Math.abs(
            measurement.points[1].x - measurement.points[0].x
          );

          let distance: number;
          if (distanceToUse && pointsToUse && pointsToUse.length === 2) {
            const standardPixelDx = pointsToUse[1].x - pointsToUse[0].x;
            const standardPixelDy = pointsToUse[1].y - pointsToUse[0].y;
            const standardPixelLength = Math.sqrt(
              standardPixelDx * standardPixelDx +
                standardPixelDy * standardPixelDy
            );
            distance = (pixelDistance / standardPixelLength) * distanceToUse;
          } else {
            distance = (pixelDistance / imageWidth) * referenceWidth;
          }

          return {
            ...measurement,
            value: `${distance.toFixed(2)}mm`,
          };
        }

        return measurement;
      })
    );
  };

  return {
    measurements,
    setMeasurements,
    reportText,
    setReportText,
    standardDistance,
    setStandardDistance,
    standardDistanceValue,
    setStandardDistanceValue,
    standardDistancePoints,
    setStandardDistancePoints,
    hoveredStandardPointIndex,
    setHoveredStandardPointIndex,
    draggingStandardPointIndex,
    setDraggingStandardPointIndex,
    tags,
    setTags,
    newTag,
    setNewTag,
    showTagPanel,
    setShowTagPanel,
    treatmentAdvice,
    setTreatmentAdvice,
    showAdvicePanel,
    setShowAdvicePanel,
    recalculateAVTandTS,
  };
}
