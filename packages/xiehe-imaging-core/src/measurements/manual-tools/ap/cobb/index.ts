/**
 * 正位 Cobb 的终板选择和符号语义由 AP 流程保证；基础夹角与命中规则复用 shared。
 */
export {
  calculateCobbResults as calculateApCobbResults,
  isCobbInRange as isApCobbInRange,
} from '../../../shared-rules';
export * from './resolver';
