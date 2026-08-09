import { Point } from '@xiehe/imaging-core/contracts';

/**
 * 画布局部状态类型，供 AnnotationCanvas 子模块共享。
 */
export interface DrawingState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
}

export interface SelectionState {
  measurementId: string | null;
  pointIndex: number | null;
  type: 'point' | 'line' | 'whole' | 'effective-cfh' | null;
  isDragging: boolean;
  dragOffset: Point;
}

export interface HoverState {
  measurementId: string | null;
  keypointId: string | null;
  pointIndex: number | null;
  elementType: 'point' | 'whole' | 'keypoint' | 'effective-cfh' | null;
}

export interface ReferenceLines {
  t1Tilt: Point | null;
  ca: Point | null;
  po: Point | null;
  css: Point | null;
  avt: Point | null;
  ts: Point | null;
  lld: Point | null;
  ss: Point | null;
  sva: Point | null;
  horizontalLine: Point | null;
  verticalLine: Point | null;
}
