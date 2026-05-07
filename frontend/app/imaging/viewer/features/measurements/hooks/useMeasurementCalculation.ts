import { useCallback, useMemo } from 'react';
import { ImageSize, Point } from '@/app/imaging/viewer/shared/types';
import { CalculationContext } from '@/app/imaging/viewer/features/measurements/catalog/shared/annotation-config';
import { calculateMeasurementValue as calcMeasurementValue } from '@/app/imaging/viewer/features/measurements/domain/annotation-calculation';
import { getDescriptionForType as getDesc } from '@/app/imaging/viewer/features/measurements/domain/annotation-metadata';

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
