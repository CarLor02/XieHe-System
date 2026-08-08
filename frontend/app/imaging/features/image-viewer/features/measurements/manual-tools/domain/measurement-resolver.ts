import {
  AP_COBB_RESOLVER,
  AVT_MEASUREMENT_RESOLVER,
  type ResolvedAvtMeasurement,
  TTS_MEASUREMENT_RESOLVER,
  type ResolvedTtsMeasurement,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap';
import {
  LATERAL_COBB_RESOLVERS,
  PELVIC_MEASUREMENT_RESOLVER,
  type ResolvedPelvicMeasurement,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral';
import type { ResolvedCobbMeasurement } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/cobb';
import type {
  CobbEndpointPointIds,
  CobbMeasurementDescriptor,
  CobbResolver,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/cobb';
import type {
  MeasurementResolver,
  MeasurementResolverContext,
  VariableMeasurementResolution,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/resolver';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

export type ResolvedVariableMeasurement =
  | ResolvedCobbMeasurement
  | ResolvedAvtMeasurement
  | ResolvedTtsMeasurement
  | ResolvedPelvicMeasurement;

const COBB_RESOLVERS: readonly CobbResolver[] = [
  ...LATERAL_COBB_RESOLVERS,
  AP_COBB_RESOLVER,
];

const VARIABLE_MEASUREMENT_RESOLVERS: readonly MeasurementResolver<ResolvedVariableMeasurement>[] =
  [
    ...COBB_RESOLVERS,
    AVT_MEASUREMENT_RESOLVER,
    TTS_MEASUREMENT_RESOLVER,
    PELVIC_MEASUREMENT_RESOLVER,
  ];

/**
 * 可变布局 measurement 的唯一解析入口。
 *
 * `not-applicable` 表示固定布局工具，应继续走 catalog/domain 原有路径；
 * `invalid` 表示已识别工具的历史数据损坏，调用方必须保留记录但停止画布交互。
 */
export function resolveVariableMeasurement(
  measurement: MeasurementData,
  context: MeasurementResolverContext
): VariableMeasurementResolution<ResolvedVariableMeasurement> {
  const resolver = VARIABLE_MEASUREMENT_RESOLVERS.find(candidate =>
    candidate.supports(measurement, context)
  );
  if (!resolver) return { status: 'not-applicable' };

  return {
    resolverId: resolver.id,
    ...resolver.resolve(measurement, context),
  };
}

export function resolveCobbEndpointPointIds(
  descriptor: CobbMeasurementDescriptor,
  context: MeasurementResolverContext
): CobbEndpointPointIds | null {
  const resolver = COBB_RESOLVERS.find(candidate =>
    candidate.matchesDescriptor(descriptor, context)
  );
  return resolver?.resolveEndpointPointIds(descriptor) ?? null;
}

export function resolveCobbMeasurement(
  measurement: MeasurementData,
  context: MeasurementResolverContext
): ResolvedCobbMeasurement | null {
  const resolution = resolveVariableMeasurement(measurement, context);
  return resolution.status === 'resolved' && resolution.value.kind === 'cobb'
    ? resolution.value
    : null;
}
