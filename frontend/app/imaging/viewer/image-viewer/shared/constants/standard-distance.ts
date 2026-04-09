/**
 * 标准距离默认配置。
 */
export const STANDARD_DISTANCE_CONSTANTS = {
  /** 默认标准距离值（毫米） */
  DEFAULT_DISTANCE: 100,

  /** 默认标准距离点位置 */
  DEFAULT_POINTS: [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ],
} as const;

export const STANDARD_DISTANCE_DEPENDENT_TYPES = [
  'AVT',
  'TTS',
  'SVA',
] as const;

