import type { ResolvedVariableMeasurementBase } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/resolver';
import type {
  MeasurementResolver,
  MeasurementResolverContext,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/resolver';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

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
