import type {
  MeasurementData,
  PelvicMeasurementMetadata,
  Point,
} from '../../../shared/domain/contracts';
import {
  getAnnotationTypeId,
  getNextCobbType,
  hasUniqueAnnotationForTool,
  measurementMatchesTool,
  type AnnotationToolIdentity,
  type CalculationContext,
} from '../../domain';
import type { MeasurementValueCalculator } from '../ports';

export interface PlanMeasurementAdditionDependencies {
  calculator: MeasurementValueCalculator;
  createId: () => string;
  getDescription: (typeId: string) => string;
  getDefaultValue: (typeId: string) => string;
}

export interface PlanMeasurementAdditionOptions {
  allowReplace?: boolean;
  keypointSynced?: boolean;
  pelvicMetadata?: PelvicMeasurementMetadata;
  cobbEndpoints?: {
    upperVertebra: string | null;
    lowerVertebra: string | null;
  };
}

export type PlanMeasurementAdditionResult =
  | { status: 'duplicate'; measurements: MeasurementData[] }
  | {
      status: 'created' | 'replaced';
      measurement: MeasurementData;
      measurements: MeasurementData[];
    };

export function planMeasurementAddition({
  type,
  points = [],
  measurements,
  tools,
  calculationContext,
  options = {},
  dependencies,
}: {
  type: string;
  points?: Point[];
  measurements: MeasurementData[];
  tools: readonly AnnotationToolIdentity[];
  calculationContext: CalculationContext;
  options?: PlanMeasurementAdditionOptions;
  dependencies: PlanMeasurementAdditionDependencies;
}): PlanMeasurementAdditionResult {
  const {
    allowReplace = false,
    keypointSynced = false,
    pelvicMetadata,
    cobbEndpoints,
  } = options;
  const requestedToolId = getAnnotationTypeId(type);
  const isCobb =
    requestedToolId === 'cobb' || requestedToolId === 'lateral-cobb';
  const finalType = isCobb
    ? getNextCobbType(
        measurements,
        requestedToolId === 'lateral-cobb' ? 'lateral-cobb' : 'cobb'
      )
    : requestedToolId;
  const configLookupType = isCobb ? requestedToolId : finalType;
  const value =
    dependencies.calculator.calculateType(
      configLookupType,
      points,
      calculationContext
    ) || dependencies.getDefaultValue(configLookupType);
  const measurement: MeasurementData = {
    id: dependencies.createId(),
    type: finalType,
    value,
    points,
    description: dependencies.getDescription(configLookupType),
    ...(keypointSynced ? { keypointSynced: true } : {}),
    ...(pelvicMetadata ? { pelvicMetadata } : {}),
    ...(cobbEndpoints
      ? {
          upperVertebra: cobbEndpoints.upperVertebra,
          lowerVertebra: cobbEndpoints.lowerVertebra,
        }
      : {}),
  };

  const currentTool = tools.find(tool => tool.id === configLookupType);
  if (currentTool && hasUniqueAnnotationForTool(measurements, currentTool)) {
    if (!allowReplace) return { status: 'duplicate', measurements };
    const retainedMeasurements = measurements.filter(
      existingMeasurement =>
        !measurementMatchesTool(existingMeasurement, currentTool)
    );
    return {
      status: 'replaced',
      measurement,
      measurements: [...retainedMeasurements, measurement],
    };
  }

  return {
    status: 'created',
    measurement,
    measurements: [...measurements, measurement],
  };
}
