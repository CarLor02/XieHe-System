import type { Dispatch, SetStateAction } from 'react';

import type { Tool } from '@/app/imaging/features/image-viewer/shared/types';
import { getDescriptionForType } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-metadata';
import { measurementValueCalculator } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/calculateMeasurementValue';
import type {
  ImageSize,
  MeasurementData,
  PelvicMeasurementMetadata,
  Point,
} from '@xiehe/imaging-core/contracts';
import { planMeasurementAddition } from '@xiehe/imaging-core/measurements';

export function addMeasurement(
  type: string,
  points: Point[] = [],
  setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>,
  tools: Tool[],
  standardDistance: number | null,
  standardDistancePoints: Point[],
  imageNaturalSize: ImageSize,
  options: {
    /** 替换模式：当同类型测量已存在时，用新测量替换旧测量（而非拦截）。 */
    allowReplace?: boolean;
    /** 标记该测量项由统一关键点绑定规则维护。 */
    keypointSynced?: boolean;
    /** PI/PT v2 的单/双股骨头模式；旧数据没有该字段时按单 FH 兼容。 */
    pelvicMetadata?: PelvicMeasurementMetadata;
    cobbEndpoints?: {
      upperVertebra: string | null;
      lowerVertebra: string | null;
    };
  } = {}
) {
  setMeasurements(
    previousMeasurements =>
      planMeasurementAddition({
        type,
        points,
        measurements: previousMeasurements,
        tools,
        calculationContext: {
          standardDistance,
          standardDistancePoints,
          imageNaturalSize,
        },
        options,
        dependencies: {
          calculator: measurementValueCalculator,
          createId: () => Date.now().toString(),
          getDescription: getDescriptionForType,
          getDefaultValue: () => '0.0°',
        },
      }).measurements
  );
}
