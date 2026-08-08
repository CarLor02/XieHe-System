import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-type-id';
import {
  invalid,
  resolved,
  type MeasurementResolver,
  type ResolvedVariableMeasurementBase,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/resolver';
import { isApProjectionExamType } from '@/app/imaging/features/image-viewer/shared/domain/exam-type';

import {
  getAvtGeometry,
  resolveAvtDefinition,
  type AvtGeometry,
  type ResolvedAvtDefinition,
} from './measurement-geometry';

export interface ResolvedAvtMeasurement extends ResolvedVariableMeasurementBase {
  kind: 'avt';
  definition: ResolvedAvtDefinition;
  geometry: AvtGeometry;
}

export const AVT_MEASUREMENT_RESOLVER: MeasurementResolver<ResolvedAvtMeasurement> =
  {
    id: 'ap-avt',
    supports(measurement, context) {
      return (
        isApProjectionExamType(context.examType) &&
        getAnnotationTypeId(measurement.type) === 'avt'
      );
    },
    resolve(measurement) {
      const definition = resolveAvtDefinition(measurement);
      const geometry = getAvtGeometry(measurement);
      if (!definition || !geometry) {
        return invalid('AVT metadata 与点位布局不匹配');
      }
      return resolved({
        kind: 'avt',
        resolverId: 'ap-avt',
        measurement,
        definition,
        geometry,
        interactivePoints: measurement.points,
      });
    },
  };
