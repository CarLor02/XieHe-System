/**
 * 点击检测与交互反馈相关常量。
 */
export const INTERACTION_CONSTANTS = {
  /** 点击点的检测半径（屏幕像素） */
  POINT_CLICK_RADIUS: 10,

  /** 点击线段的检测半径（屏幕像素） */
  LINE_CLICK_RADIUS: 8,

  /** 悬浮检测半径（屏幕像素） */
  HOVER_RADIUS: 10,

  /** 选中框的内边距（屏幕像素） */
  SELECTION_PADDING: 15,

  /** 多边形自动闭合的距离阈值（图像像素，需要除以 imageScale） */
  POLYGON_CLOSE_THRESHOLD: 10,

  /** 点击已有点进行删除的距离阈值（图像像素，需要除以 imageScale） */
  POINT_DELETE_THRESHOLD: 5,
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
  'pelvic',
  'sacral',
  'ss',
] as const;

export const VERTICAL_LINE_TOOLS = ['avt', 'ts', 'sva'] as const;
