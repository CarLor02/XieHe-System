/**
 * 正位 Cobb 的终板选择和符号语义由 AP 流程保证；基础夹角与命中规则复用 shared。
 */
export {
  calculateCobbResults as calculateApCobbResults,
  isCobbInRange as isApCobbInRange,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/cobb';
export * from './resolver';
