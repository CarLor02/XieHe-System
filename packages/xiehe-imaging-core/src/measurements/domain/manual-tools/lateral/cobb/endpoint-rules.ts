export interface LateralNamedCobbMeasurementRule {
  name: string;
  upperVertebra: string;
  lowerVertebra: string;
  endpointPointIds: [string, string, string, string];
}

export type LateralCobbEndpointRole = 'upper' | 'lower';

/** 通用侧位 Cobb 的端板点规则；S1 只有上终板两个关键点。 */
export function getGenericLateralCobbEndpointPointIds(
  vertebra: string,
  role: LateralCobbEndpointRole
): readonly [string, string] {
  const normalized = vertebra.trim().toUpperCase();
  if (role === 'upper' || normalized === 'S1') {
    return [`${normalized}-1`, `${normalized}-2`];
  }
  return [`${normalized}-3`, `${normalized}-4`];
}

export const LATERAL_NAMED_COBB_MEASUREMENT_RULES: LateralNamedCobbMeasurementRule[] =
  [
    {
      name: 'C2-C7 CL',
      upperVertebra: 'C2',
      lowerVertebra: 'C7',
      endpointPointIds: ['C2-3', 'C2-4', 'C7-3', 'C7-4'],
    },
    {
      name: 'TK T2-T5',
      upperVertebra: 'T2',
      lowerVertebra: 'T5',
      endpointPointIds: ['T2-1', 'T2-2', 'T5-3', 'T5-4'],
    },
    {
      name: 'TK T5-T12',
      upperVertebra: 'T5',
      lowerVertebra: 'T12',
      endpointPointIds: ['T5-1', 'T5-2', 'T12-3', 'T12-4'],
    },
    {
      name: 'T10-L2',
      upperVertebra: 'T10',
      lowerVertebra: 'L2',
      endpointPointIds: ['T10-1', 'T10-2', 'L2-3', 'L2-4'],
    },
    {
      name: 'LL L1-S1',
      upperVertebra: 'L1',
      lowerVertebra: 'S1',
      endpointPointIds: ['L1-1', 'L1-2', 'S1-1', 'S1-2'],
    },
    {
      name: 'LL L1-L4',
      upperVertebra: 'L1',
      lowerVertebra: 'L4',
      endpointPointIds: ['L1-1', 'L1-2', 'L4-3', 'L4-4'],
    },
    {
      name: 'LL L4-S1',
      upperVertebra: 'L4',
      lowerVertebra: 'S1',
      endpointPointIds: ['L4-1', 'L4-2', 'S1-1', 'S1-2'],
    },
  ];

/** 稳定工具 ID 与侧位命名 Cobb 规则的映射，供 resolver 和关键点绑定共用。 */
export const LATERAL_NAMED_COBB_TYPE_IDS_BY_NAME: Readonly<
  Record<string, readonly string[]>
> = {
  'C2-C7 CL': ['cl', 'c2-c7-cl'],
  'TK T2-T5': ['tk-t2-t5'],
  'TK T5-T12': ['tk-t5-t12'],
  'T10-L2': ['t10-l2'],
  'LL L1-S1': ['ll-l1-s1'],
  'LL L1-L4': ['ll-l1-l4'],
  'LL L4-S1': ['ll-l4-s1'],
};

export function getLateralNamedCobbMeasurementRuleByTypeId(
  typeId: string
): LateralNamedCobbMeasurementRule | null {
  return (
    LATERAL_NAMED_COBB_MEASUREMENT_RULES.find(rule =>
      LATERAL_NAMED_COBB_TYPE_IDS_BY_NAME[rule.name]?.includes(typeId)
    ) ?? null
  );
}

export function getLateralNamedCobbMeasurementRuleByEndpoints(
  upperVertebra: string,
  lowerVertebra: string
): LateralNamedCobbMeasurementRule | null {
  return (
    LATERAL_NAMED_COBB_MEASUREMENT_RULES.find(
      rule =>
        rule.upperVertebra === upperVertebra &&
        rule.lowerVertebra === lowerVertebra
    ) ?? null
  );
}
