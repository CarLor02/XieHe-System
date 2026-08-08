import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-type-id';
import {
  buildResolvedCobbMeasurement,
  normalizeCobbVertebra,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/cobb/resolver-utils';
import type {
  CobbEndpointPointIds,
  CobbMeasurementDescriptor,
  CobbResolver,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/cobb/resolver-types';
import {
  invalid,
  resolved,
  type MeasurementResolverContext,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/resolver';
import { isLateralExamType } from '@/app/imaging/features/image-viewer/shared/domain/exam-type';

import {
  LATERAL_NAMED_COBB_MEASUREMENT_RULES,
  type LateralNamedCobbMeasurementRule,
} from './endpoint-rules';

const LATERAL_GENERIC_COBB_PATTERN = /^(?:lateral-)?cobb\d*$/;

const NAMED_TYPE_IDS: Record<string, readonly string[]> = {
  'C2-C7 CL': ['cl', 'c2-c7-cl'],
  'TK T2-T5': ['tk-t2-t5'],
  'TK T5-T12': ['tk-t5-t12'],
  'T10-L2': ['t10-l2'],
  'LL L1-S1': ['ll-l1-s1'],
  'LL L1-L4': ['ll-l1-l4'],
  'LL L4-S1': ['ll-l4-s1'],
};

function isGenericLateralCobbType(type: string): boolean {
  return LATERAL_GENERIC_COBB_PATTERN.test(getAnnotationTypeId(type));
}

function hasRuleEndpoints(
  measurement: CobbMeasurementDescriptor,
  rule: LateralNamedCobbMeasurementRule
): boolean {
  return (
    normalizeCobbVertebra(measurement.upperVertebra) === rule.upperVertebra &&
    normalizeCobbVertebra(measurement.lowerVertebra) === rule.lowerVertebra
  );
}

function createNamedLateralCobbResolver(
  rule: LateralNamedCobbMeasurementRule
): CobbResolver {
  const id = `lateral-named-cobb:${rule.name}`;
  const supportedTypes = NAMED_TYPE_IDS[rule.name] ?? [];
  return {
    id,
    matchesDescriptor(measurement, context) {
      if (!isLateralExamType(context.examType)) return false;
      const typeId = getAnnotationTypeId(measurement.type);
      return (
        supportedTypes.includes(typeId) ||
        (isGenericLateralCobbType(measurement.type) &&
          hasRuleEndpoints(measurement, rule))
      );
    },
    supports(measurement, context) {
      const typeId = getAnnotationTypeId(measurement.type);
      return (
        isLateralExamType(context.examType) &&
        (supportedTypes.includes(typeId) ||
          (isGenericLateralCobbType(measurement.type) &&
            hasRuleEndpoints(measurement, rule)))
      );
    },
    resolveEndpointPointIds() {
      return rule.endpointPointIds;
    },
    resolve(measurement) {
      const value = buildResolvedCobbMeasurement({
        resolverId: id,
        measurement,
        examView: 'lateral',
        layout: 'lateral-named',
        endpointPointIds: rule.endpointPointIds,
        displayName: rule.name,
        upperVertebra: rule.upperVertebra,
        lowerVertebra: rule.lowerVertebra,
      });
      return value
        ? resolved(value)
        : invalid(`${rule.name} 必须包含四个有效终板点`);
    },
  };
}

/** 每个命名侧位 Cobb 都是独立 resolver，规则表仅用于消除重复样板代码。 */
export const LATERAL_NAMED_COBB_RESOLVERS =
  LATERAL_NAMED_COBB_MEASUREMENT_RULES.map(createNamedLateralCobbResolver);

export const LATERAL_S1_COBB_RESOLVER: CobbResolver = {
  id: 'lateral-cobb:s1-upper-endplate',
  matchesDescriptor(measurement, context) {
    return (
      isLateralExamType(context.examType) &&
      isGenericLateralCobbType(measurement.type) &&
      normalizeCobbVertebra(measurement.lowerVertebra) === 'S1'
    );
  },
  supports(measurement, context) {
    return (
      isLateralExamType(context.examType) &&
      isGenericLateralCobbType(measurement.type) &&
      normalizeCobbVertebra(measurement.lowerVertebra) === 'S1'
    );
  },
  resolveEndpointPointIds(measurement) {
    const upperVertebra = normalizeCobbVertebra(measurement.upperVertebra);
    return upperVertebra
      ? [`${upperVertebra}-1`, `${upperVertebra}-2`, 'S1-1', 'S1-2']
      : null;
  },
  resolve(measurement) {
    const upperVertebra = normalizeCobbVertebra(measurement.upperVertebra);
    const lowerVertebra = normalizeCobbVertebra(measurement.lowerVertebra);
    const endpointPointIds =
      LATERAL_S1_COBB_RESOLVER.resolveEndpointPointIds(measurement);
    const value = buildResolvedCobbMeasurement({
      resolverId: 'lateral-cobb:s1-upper-endplate',
      measurement,
      examView: 'lateral',
      layout: 'lateral-s1',
      endpointPointIds,
      displayName: measurement.type,
      upperVertebra,
      lowerVertebra,
    });
    return value
      ? resolved(value)
      : invalid('S1 侧位 Cobb 必须包含四个有效点和不同的上下端椎');
  },
};

export const LATERAL_GENERIC_COBB_RESOLVER: CobbResolver = {
  id: 'lateral-cobb:generic',
  matchesDescriptor(measurement, context) {
    return (
      isLateralExamType(context.examType) &&
      isGenericLateralCobbType(measurement.type)
    );
  },
  supports(measurement, context) {
    return (
      isLateralExamType(context.examType) &&
      isGenericLateralCobbType(measurement.type)
    );
  },
  resolveEndpointPointIds(measurement) {
    const upperVertebra = normalizeCobbVertebra(measurement.upperVertebra);
    const lowerVertebra = normalizeCobbVertebra(measurement.lowerVertebra);
    return upperVertebra && lowerVertebra && upperVertebra !== lowerVertebra
      ? [
          `${upperVertebra}-1`,
          `${upperVertebra}-2`,
          `${lowerVertebra}-3`,
          `${lowerVertebra}-4`,
        ]
      : null;
  },
  resolve(measurement) {
    const upperVertebra = normalizeCobbVertebra(measurement.upperVertebra);
    const lowerVertebra = normalizeCobbVertebra(measurement.lowerVertebra);
    const endpointPointIds =
      LATERAL_GENERIC_COBB_RESOLVER.resolveEndpointPointIds(measurement);
    const value = buildResolvedCobbMeasurement({
      resolverId: 'lateral-cobb:generic',
      measurement,
      examView: 'lateral',
      layout: 'lateral-generic',
      endpointPointIds,
      displayName: measurement.type,
      upperVertebra,
      lowerVertebra,
    });
    return value
      ? resolved(value)
      : invalid('侧位 Cobb 必须包含四个有效点，且上下端椎不能相同');
  },
};

export const LATERAL_COBB_RESOLVERS: readonly CobbResolver[] = [
  ...LATERAL_NAMED_COBB_RESOLVERS,
  LATERAL_S1_COBB_RESOLVER,
  LATERAL_GENERIC_COBB_RESOLVER,
];

export function resolveLateralCobbEndpointPointIds(
  descriptor: CobbMeasurementDescriptor,
  context: MeasurementResolverContext
): CobbEndpointPointIds | null {
  const resolver = LATERAL_COBB_RESOLVERS.find(candidate =>
    candidate.matchesDescriptor(descriptor, context)
  );
  return resolver?.resolveEndpointPointIds(descriptor) ?? null;
}
