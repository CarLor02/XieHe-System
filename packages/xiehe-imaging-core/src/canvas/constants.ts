/** Canvas 交互阈值使用屏幕像素，平台事件适配层只负责提供屏幕坐标。 */
export const CANVAS_INTERACTION_CONSTANTS = {
  pointHitRadius: 10,
  lineHitRadius: 8,
  hoverRadius: 10,
  selectionPadding: 15,
  polygonCloseThreshold: 10,
  pointDeleteThreshold: 5,
} as const;

export const AUXILIARY_TOOL_TYPES = [
  'circle',
  'ellipse',
  'rectangle',
  'arrow',
  'polygon',
  'vertebra-center',
  'aux-length',
  'aux-angle',
  'aux-horizontal-line',
  'aux-vertical-line',
] as const;

export const HORIZONTAL_LINE_TOOLS = [
  't1-tilt',
  't1-slope',
  'ca',
  'po',
  'css',
  'ss',
] as const;

export const VERTICAL_LINE_TOOLS = ['avt', 'ts', 'sva'] as const;

export const STANDARD_DISTANCE_DEPENDENT_TYPES = [
  'avt',
  'tts',
  'sva',
] as const;
