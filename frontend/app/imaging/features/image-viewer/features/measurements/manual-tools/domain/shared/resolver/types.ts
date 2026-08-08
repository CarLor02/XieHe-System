import type {
  MeasurementData,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

export interface MeasurementResolverContext {
  examType: string;
}

export interface ResolvedVariableMeasurementBase {
  kind: string;
  resolverId: string;
  measurement: MeasurementData;
  /** 画布可直接消费的持久化交互点，不允许画布再次解释点位布局。 */
  interactivePoints: readonly Point[];
}

export type ResolverResult<TResolved> =
  | { status: 'resolved'; value: TResolved }
  | { status: 'invalid'; reason: string };

export interface MeasurementResolver<TResolved> {
  id: string;
  supports(
    measurement: MeasurementData,
    context: MeasurementResolverContext
  ): boolean;
  resolve(
    measurement: MeasurementData,
    context: MeasurementResolverContext
  ): ResolverResult<TResolved>;
}

export type VariableMeasurementResolution<TResolved> =
  | { status: 'not-applicable' }
  | ({ resolverId: string } & ResolverResult<TResolved>);

export function resolved<TResolved>(
  value: TResolved
): ResolverResult<TResolved> {
  return { status: 'resolved', value };
}

export function invalid(reason: string): ResolverResult<never> {
  return { status: 'invalid', reason };
}
