export interface ApKeypointConfig {
  id: string;
  name: string;
  group: string;
  pointIndex?: number;
  kind: 'vertebra-corner' | 'pose';
}

export interface ApKeypointGroup {
  id: string;
  name: string;
  keypoints: ApKeypointConfig[];
}

export const AP_VERTEBRA_GROUPS = [
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

export const AP_POSE_KEYPOINTS = [
  'IL',
  'IR',
  'SL',
  'SR',
  'CL',
  'CR',
  'ASIS_L',
  'SI_L',
  'SI_R',
  'ASIS_R',
] as const;

export const AP_VERTEBRA_KEYPOINTS: ApKeypointConfig[] =
  AP_VERTEBRA_GROUPS.flatMap(group =>
    [1, 2, 3, 4].map(pointNumber => ({
      id: `${group}-${pointNumber}`,
      name: `${group}-${pointNumber}`,
      group,
      pointIndex: pointNumber - 1,
      kind: 'vertebra-corner' as const,
    }))
  );

export const AP_KEYPOINT_CONFIGS: ApKeypointConfig[] = [
  ...AP_VERTEBRA_KEYPOINTS,
  ...AP_POSE_KEYPOINTS.map(id => ({
    id,
    name: id,
    group: '姿态点',
    kind: 'pose' as const,
  })),
];

export const AP_KEYPOINT_CONFIG_BY_ID = new Map(
  AP_KEYPOINT_CONFIGS.map(config => [config.id, config])
);

export function getApKeypointGroups(): ApKeypointGroup[] {
  return [
    ...AP_VERTEBRA_GROUPS.map(group => ({
      id: group,
      name: group,
      keypoints: AP_VERTEBRA_KEYPOINTS.filter(
        keypoint => keypoint.group === group
      ),
    })),
    {
      id: 'pose',
      name: '姿态点',
      keypoints: AP_KEYPOINT_CONFIGS.filter(
        keypoint => keypoint.kind === 'pose'
      ),
    },
  ];
}

export function getApKeypointConfig(id: string): ApKeypointConfig | undefined {
  return AP_KEYPOINT_CONFIG_BY_ID.get(id);
}

export function isApKeypointId(id: string): boolean {
  return AP_KEYPOINT_CONFIG_BY_ID.has(id);
}

export function parseApVertebraKeypointId(
  id: string
): { group: string; pointIndex: number } | null {
  const match = /^(C7|T\d{1,2}|L\d)-([1-4])$/.exec(id);
  if (!match) return null;

  return {
    group: match[1],
    pointIndex: Number(match[2]) - 1,
  };
}
