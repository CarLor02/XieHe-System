import { Measurement, Point } from '../types';

export interface SerializedAnnotationPayload {
  imageId?: string;
  imageWidth?: number;
  imageHeight?: number;
  measurements: Array<{
    id?: string;
    type: string;
    points: Point[];
    value?: string;
    description?: string;
  }>;
  standardDistance?: number | null;
  standardDistancePoints?: Point[];
  pointBindings?: unknown;
  reportText?: string;
  savedAt?: string;
}

/**
 * 序列化时保留业务恢复所需的最小字段集。
 */
export function serializeMeasurements(measurements: Measurement[]) {
  return measurements.map(measurement => {
    if (measurement.type.startsWith('AI检测-')) {
      return {
        id: measurement.id,
        type: measurement.type,
        points: measurement.points,
        value: measurement.value,
        description: measurement.description,
      };
    }

    return {
      id: measurement.id,
      type: measurement.type,
      points: measurement.points,
    };
  });
}

