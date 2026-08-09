import type { Point } from '@xiehe/imaging-core/contracts';

/**
 * 测量公式输出的统一结构。
 *
 * 领域函数只返回数值与单位，不负责标签布局或画布渲染。
 */
export interface MeasurementResult {
  name: string;
  value: string;
  unit: string;
}

/**
 * 测量计算所需的标定上下文。
 *
 * imageNaturalSize 当前主要为兼容既有调用保留；实际毫米换算优先使用
 * standardDistance 与 standardDistancePoints。
 */
export interface CalculationContext {
  standardDistance: number | null;
  standardDistancePoints: Point[];
  imageNaturalSize: { width: number; height: number } | null;
  /** 可变布局工具必须按当前检查类型选择 AP/侧位 resolver。 */
  examType?: string;
}
