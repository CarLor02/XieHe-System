import { getAnnotationTypeId } from '../../../shared-rules';
import {
  invalid,
  resolved,
  type MeasurementResolver,
  type ResolvedVariableMeasurementBase,
} from '../../../shared-rules';
import { isApProjectionExamType } from '../../../../../shared/domain/anatomy';

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
