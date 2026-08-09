import type {
  ImageSize,
  Point,
} from '../../contracts';

/**
 * 画布坐标转换所需的完整输入。
 *
 * presentation 层负责读取真实 DOM 容器尺寸；domain 只消费显式尺寸，
 * 因而同一套转换可以用于浏览器画布、导出和单元测试。
 */
export interface TransformContext {
  imageNaturalSize: ImageSize | null;
  imagePosition: Point;
  imageScale: number;
  containerSize: ImageSize | null;
}
