/**
 * 交互常量配置
 * 定义所有与用户交互相关的常量值
 */

/**
 * 点击检测相关常量
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
  
  /** 多边形自动闭合的距离阈值（图像像素，需要除以imageScale） */
  POLYGON_CLOSE_THRESHOLD: 10,
  
  /** 点击已有点进行删除的距离阈值（图像像素，需要除以imageScale） */
  POINT_DELETE_THRESHOLD: 5,
} as const;

/**
 * 文字标注相关常量
 */
export const TEXT_LABEL_CONSTANTS = {
  /** 默认字体大小（像素） */
  DEFAULT_FONT_SIZE: 14,
  
  /** 悬浮时字体大小（像素） */
  HOVER_FONT_SIZE: 16,
  
  /** 文字内边距（像素） */
  PADDING: 4,
  
  /** 字符宽度估算系数 */
  CHAR_WIDTH_RATIO: 0.6,
  
  /** 行高系数 */
  LINE_HEIGHT_RATIO: 1.4,
} as const;

/**
 * 图像调整相关常量
 */
export const IMAGE_ADJUSTMENT_CONSTANTS = {
  /** 亮度调整范围 */
  BRIGHTNESS_MIN: -100,
  BRIGHTNESS_MAX: 100,
  BRIGHTNESS_DEFAULT: 0,
  
  /** 对比度调整范围 */
  CONTRAST_MIN: -100,
  CONTRAST_MAX: 100,
  CONTRAST_DEFAULT: 0,
  
  /** 缩放范围 */
  SCALE_MIN: 0.1,
  SCALE_MAX: 10,
  SCALE_DEFAULT: 1,
  
  /** 滚轮缩放步长 */
  ZOOM_STEP: 0.1,
} as const;

/**
 * 标准距离相关常量
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

/**
 * 辅助工具类型列表
 */
export const AUXILIARY_TOOL_TYPES = [
  'circle',
  'ellipse',
  'rectangle',
  'arrow',
  'polygon',
  'vertebra-center',
] as const;

/**
 * 需要水平参考线的工具类型
 */
export const HORIZONTAL_LINE_TOOLS = [
  't1-tilt',
  't1-slope',
  'ca',
  'pelvic',
  'sacral',
  'ss',
] as const;

/**
 * 需要垂直参考线的工具类型
 */
export const VERTICAL_LINE_TOOLS = [
  'avt',
  'ts',
  'sva',
] as const;

/**
 * 依赖标准距离的测量类型
 */
export const STANDARD_DISTANCE_DEPENDENT_TYPES = [
  'AVT',
  'TS',
  'SVA',
] as const;

/**
 * 容器选择器
 */
export const SELECTORS = {
  IMAGE_CANVAS: '[data-image-canvas]',
} as const;

/**
 * 消息显示时长（毫秒）
 */
export const MESSAGE_DURATION = {
  SHORT: 2000,
  MEDIUM: 3000,
  LONG: 5000,
} as const;

/**
 * 默认图像尺寸（用于参考）
 */
export const DEFAULT_IMAGE_SIZE = {
  WIDTH: 1000,
  HEIGHT: 1000,
  REFERENCE_WIDTH: 300,
} as const;

/**
 * 颜色常量
 */
export const COLORS = {
  /** 选中状态颜色 */
  SELECTION: '#3b82f6',
  
  /** 悬浮状态颜色 */
  HOVER: '#60a5fa',
  
  /** 标准距离颜色 */
  STANDARD_DISTANCE: '#a855f7',
  
  /** 辅助图形颜色 */
  AUXILIARY: '#10b981',
  
  /** 测量标注颜色 */
  MEASUREMENT: '#ef4444',
} as const;

