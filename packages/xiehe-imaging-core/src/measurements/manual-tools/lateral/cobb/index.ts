export * from './endpoint-rules';
export * from './resolvers';
/**
 * 侧位端椎到四点的转换在 endpoint-rules 中完成；夹角和命中只复用纯 Cobb 基元。
 */
export {
  calculateCobbResults as calculateLateralCobbResults,
  isCobbInRange as isLateralCobbInRange,
} from '../../../shared-rules';
