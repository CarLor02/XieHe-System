import { useCallback, useMemo } from 'react';
import { ImageSize, Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { CalculationContext } from '@/app/imaging/features/image-viewer/features/measurements/domain/measurement-calculation-types';
import { calculateMeasurementValue as calcMeasurementValue } from '@/app/imaging/features/image-viewer/features/measurements/usecases/calculateMeasurementValue';
import { getDescriptionForType as getDesc } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-metadata';

interface UseMeasurementCalculationOptions {
  standardDistance: number | null;
  standardDistancePoints: Point[];
  imageNaturalSize: ImageSize | null;
}

export function useMeasurementCalculation({
  standardDistance,
  standardDistancePoints,
  imageNaturalSize,
}: UseMeasurementCalculationOptions) {
  const calculationContext = useMemo<CalculationContext>(
    () => ({
      standardDistance,
      standardDistancePoints,
      imageNaturalSize,
    }),
    [imageNaturalSize, standardDistance, standardDistancePoints]
  );

  const calculateMeasurementValue = useCallback(
    (type: string, points: Point[]): string =>
      calcMeasurementValue(type, points, calculationContext),
    [calculationContext]
  );

  const getDescriptionForType = useCallback(
    (type: string): string => getDesc(type),
    []
  );

  return {
    calculationContext,
    calculateMeasurementValue,
    getDescriptionForType,
  };
}
