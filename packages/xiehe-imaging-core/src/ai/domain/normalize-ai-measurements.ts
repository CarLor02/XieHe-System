import { isBendingExamType } from '../../shared/domain/anatomy';
import type {
  ImageSize,
  MeasurementData,
  Point,
} from '../../shared/domain/contracts';
import { filterUniqueAnnotationDuplicates } from '../../measurements/domain/annotation-rules/uniqueness';
import { getAnnotationTypeId } from '../../measurements/domain/annotation-type-id';
import type {
  AiMeasurementInput,
  NormalizeAiMeasurementsOptions,
  NormalizedAiMeasurements,
} from './contracts';

function sourceImageSize(
  response: NormalizeAiMeasurementsOptions['response']
): ImageSize | null {
  const width = response.imageWidth ?? response.image_width ?? response.width;
  const height =
    response.imageHeight ?? response.image_height ?? response.height;
  return width && height ? { width, height } : null;
}

function isCobbType(type: string): boolean {
  return (
    type.startsWith('Cobb-') ||
    /^cobb(?:-auto)?\d*$/i.test(getAnnotationTypeId(type))
  );
}

function isValidMeasurement(
  measurement: AiMeasurementInput,
  options: NormalizeAiMeasurementsOptions
): boolean {
  if (!Array.isArray(measurement.points)) return false;
  if (isBendingExamType(options.examType) && !isCobbType(measurement.type)) {
    return false;
  }
  const typeId = getAnnotationTypeId(measurement.type);
  const tool =
    options.resolveTool(measurement.type) ?? options.resolveTool(typeId);
  if (!tool || tool.category !== 'measurement') return false;
  return tool.id !== 'sva' || measurement.points.length === 5;
}

export function normalizeAiMeasurements(
  options: NormalizeAiMeasurementsOptions
): NormalizedAiMeasurements {
  const aiImageSize = sourceImageSize(options.response);
  const scale = {
    x:
      options.actualImageSize && aiImageSize
        ? options.actualImageSize.width / aiImageSize.width
        : 1,
    y:
      options.actualImageSize && aiImageSize
        ? options.actualImageSize.height / aiImageSize.height
        : 1,
  };
  let cobbCount = 0;

  const measurements = (options.response.measurements ?? [])
    .filter(measurement => isValidMeasurement(measurement, options))
    .map((measurement, index): MeasurementData => {
      const incomingTypeId = getAnnotationTypeId(measurement.type);
      const tool =
        options.resolveTool(measurement.type) ??
        options.resolveTool(incomingTypeId);
      const requiredPoints = tool?.pointsNeeded ?? measurement.points.length;
      const points: Point[] = measurement.points
        .slice(0, requiredPoints > 0 ? requiredPoints : undefined)
        .map(point => ({ x: point.x * scale.x, y: point.y * scale.y }));
      const sourceIsNamedCobb = measurement.type.startsWith('Cobb-');
      if (sourceIsNamedCobb) cobbCount += 1;
      const finalType = sourceIsNamedCobb
        ? `cobb${cobbCount}`
        : (tool?.id ?? incomingTypeId);
      const calculationType = sourceIsNamedCobb ? 'cobb' : finalType;

      return {
        id: options.createId(measurement, index),
        type: finalType,
        value:
          typeof measurement.value === 'string' && measurement.value
            ? measurement.value
            : options.calculateValue(calculationType, points),
        points,
        description: sourceIsNamedCobb
          ? 'Cobb角测量'
          : options.describeType(finalType),
        originalType: measurement.type,
        upperVertebra: measurement.upper_vertebra,
        lowerVertebra: measurement.lower_vertebra,
        apexVertebra: measurement.apex_vertebra,
      };
    });

  return {
    measurements: filterUniqueAnnotationDuplicates(measurements),
    sourceImageSize: aiImageSize,
    scale,
  };
}
