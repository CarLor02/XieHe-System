export interface LateralKeypointConfig {
  id: string;
  name: string;
  group: string;
  pointIndex?: number;
  kind: 'vertebra-corner' | 'sacral-endplate' | 'anatomical-point';
}

export interface LateralKeypointGroup {
  id: string;
  name: string;
  keypoints: LateralKeypointConfig[];
}

export const LATERAL_VERTEBRA_GROUPS = [
  'C2',
  'C3',
  'C4',
  'C5',
  'C6',
  'C7',
  'T1',
  'T2',
  'T3',
  'T4',
  'T5',
  'T6',
  'T7',
  'T8',
  'T9',
  'T10',
  'T11',
  'T12',
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
] as const;

export const LATERAL_CENTER_VERTEBRA_GROUPS = [
  'C3',
  'C4',
  'C5',
  'C6',
  'C7',
  'T1',
  'T2',
  'T3',
  'T4',
  'T5',
  'T6',
  'T7',
  'T8',
  'T9',
  'T10',
  'T11',
  'T12',
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
] as const;

export const LATERAL_SACRAL_GROUP = 'S1';
export const LATERAL_SACRAL_KEYPOINTS = ['S1-1', 'S1-2'] as const;
export const LATERAL_ANATOMICAL_KEYPOINTS = ['CFH'] as const;

export const LATERAL_VERTEBRA_KEYPOINTS: LateralKeypointConfig[] =
  LATERAL_VERTEBRA_GROUPS.flatMap(group =>
    [1, 2, 3, 4].map(pointNumber => ({
      id: `${group}-${pointNumber}`,
      name: `${group}-${pointNumber}`,
      group,
      pointIndex: pointNumber - 1,
      kind: 'vertebra-corner' as const,
    }))
  );

export const LATERAL_KEYPOINT_CONFIGS: LateralKeypointConfig[] = [
  ...LATERAL_VERTEBRA_KEYPOINTS,
  ...LATERAL_SACRAL_KEYPOINTS.map((id, index) => ({
    id,
    name: id,
    group: LATERAL_SACRAL_GROUP,
    pointIndex: index,
    kind: 'sacral-endplate' as const,
  })),
  ...LATERAL_ANATOMICAL_KEYPOINTS.map(id => ({
    id,
    name: id,
    group: id,
    kind: 'anatomical-point' as const,
  })),
];

export const LATERAL_KEYPOINT_CONFIG_BY_ID = new Map(
  LATERAL_KEYPOINT_CONFIGS.map(config => [config.id, config])
);

export function getLateralKeypointGroups(): LateralKeypointGroup[] {
  return [
    ...LATERAL_VERTEBRA_GROUPS.map(group => ({
      id: group,
      name: group,
      keypoints: LATERAL_VERTEBRA_KEYPOINTS.filter(
        keypoint => keypoint.group === group
      ),
    })),
    {
      id: LATERAL_SACRAL_GROUP,
      name: LATERAL_SACRAL_GROUP,
      keypoints: LATERAL_KEYPOINT_CONFIGS.filter(
        keypoint => keypoint.kind === 'sacral-endplate'
      ),
    },
    {
      id: 'CFH',
      name: 'CFH',
      keypoints: LATERAL_KEYPOINT_CONFIGS.filter(
        keypoint => keypoint.kind === 'anatomical-point'
      ),
    },
  ];
}

export function getLateralKeypointConfig(
  id: string
): LateralKeypointConfig | undefined {
  return LATERAL_KEYPOINT_CONFIG_BY_ID.get(id);
}

export function isLateralKeypointId(id: string): boolean {
  return LATERAL_KEYPOINT_CONFIG_BY_ID.has(id);
}

export function parseLateralVertebraKeypointId(
  id: string
): { group: string; pointIndex: number } | null {
  const match = /^(C[2-7]|T\d{1,2}|L\d)-([1-4])$/.exec(id);
  if (!match) return null;

  return {
    group: match[1],
    pointIndex: Number(match[2]) - 1,
  };
}

export function parseLateralSacralKeypointId(
  id: string
): { group: 'S1'; pointIndex: number } | null {
  const match = /^S1-([1-2])$/.exec(id);
  if (!match) return null;

  return {
    group: 'S1',
    pointIndex: Number(match[1]) - 1,
  };
}

export function isLateralVertebraLabel(label: string): boolean {
  return LATERAL_VERTEBRA_GROUPS.includes(
    label as (typeof LATERAL_VERTEBRA_GROUPS)[number]
  );
}
