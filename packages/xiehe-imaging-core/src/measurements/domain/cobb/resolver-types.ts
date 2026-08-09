import type { MeasurementData, Point } from '../../../shared/domain/contracts';
import type {
  MeasurementResolver,
  MeasurementResolverContext,
  ResolvedVariableMeasurementBase,
} from '../resolver';

export type CobbPointTuple = readonly [Point, Point, Point, Point];
export type CobbEndpointPointIds = readonly [string, string, string, string];

export type CobbMeasurementDescriptor = Pick<
  MeasurementData,
  'type' | 'upperVertebra' | 'lowerVertebra'
>;

export interface CobbResolver extends MeasurementResolver<ResolvedCobbMeasurement> {
  matchesDescriptor(
    descriptor: CobbMeasurementDescriptor,
    context: MeasurementResolverContext
  ): boolean;
  resolveEndpointPointIds(
    descriptor: CobbMeasurementDescriptor
  ): CobbEndpointPointIds | null;
}

export interface ResolvedCobbMeasurement extends ResolvedVariableMeasurementBase {
  kind: 'cobb';
  examView: 'ap' | 'lateral';
  layout: 'ap-generic' | 'lateral-generic' | 'lateral-named' | 'lateral-s1';
  points: CobbPointTuple;
  upperEndplate: readonly [Point, Point];
  lowerEndplate: readonly [Point, Point];
  upperVertebra: string | null;
  lowerVertebra: string | null;
  endpointPointIds: CobbEndpointPointIds | null;
  displayName: string;
}
