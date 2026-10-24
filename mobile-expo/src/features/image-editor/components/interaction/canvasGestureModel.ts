import type { Point } from '@xiehe/imaging-core/contracts';
import type { EditorSelection } from '@/features/image-editor/application/dragAnnotation';

export type Viewport = { imageScale: number; imagePosition: Point };
export type PanSample = {
  x: number;
  y: number;
  translationX: number;
  translationY: number;
};
export type DragPlan =
  | { kind: 'viewport'; origin: Point }
  | { kind: 'shape' }
  | {
      kind: 'annotation';
      selection: EditorSelection;
      offset: Point;
      fixed: Partial<Point>;
      origin: Point;
      pixelsPerUnit: number;
    };
export type DragPreview = { selection: EditorSelection; point: Point } | null;
export type MoveMailbox = {
  latest: PanSample | null;
  revision: number;
  sent: number;
  inFlight: boolean;
};

export function controlPointKey(selection: EditorSelection): string {
  'worklet';
  if (selection.kind === 'point')
    return `point:${selection.measurementId}:${selection.pointIndex}`;
  if (selection.kind === 'keypoint') return `keypoint:${selection.keypointId}`;
  if (selection.kind === 'calibration')
    return `calibration:${selection.pointIndex}`;
  if (selection.kind === 'effective-cfh')
    return `cfh:${selection.measurementId}`;
  return '';
}

export function projectControlPoint(
  point: Point,
  origin: Point,
  unit: number,
  viewport: Viewport,
  center: Point
): Point {
  'worklet';
  return {
    x:
      (origin.x + point.x * unit - center.x) * viewport.imageScale +
      viewport.imagePosition.x +
      center.x,
    y:
      (origin.y + point.y * unit - center.y) * viewport.imageScale +
      viewport.imagePosition.y +
      center.y,
  };
}

export function emptyMailbox(): MoveMailbox {
  'worklet';
  return { latest: null, revision: 0, sent: 0, inFlight: false };
}

export function enqueueMove(
  mailbox: MoveMailbox,
  sample: PanSample
): MoveMailbox {
  'worklet';
  const previous = mailbox.latest;
  if (
    previous &&
    previous.x === sample.x &&
    previous.y === sample.y &&
    previous.translationX === sample.translationX &&
    previous.translationY === sample.translationY
  )
    return mailbox;
  return { ...mailbox, latest: sample, revision: mailbox.revision + 1 };
}

export function takeMove(mailbox: MoveMailbox): MoveMailbox | null {
  'worklet';
  if (mailbox.inFlight || !mailbox.latest || mailbox.sent === mailbox.revision)
    return null;
  return { ...mailbox, sent: mailbox.revision, inFlight: true };
}

export function previewPoint(
  plan: Extract<DragPlan, { kind: 'annotation' }>,
  sample: PanSample
): Point {
  'worklet';
  return {
    x:
      plan.fixed.x ??
      (sample.x - plan.origin.x) / plan.pixelsPerUnit - plan.offset.x,
    y:
      plan.fixed.y ??
      (sample.y - plan.origin.y) / plan.pixelsPerUnit - plan.offset.y,
  };
}

/** 纯视口变换；业务坐标约束已由 core 生成，UI runtime 不执行测量计算。 */
export function pinchViewport(
  start: Viewport,
  focal: Point,
  current: Point,
  scale: number,
  center: Point
): Viewport {
  'worklet';
  const imageScale = Math.max(0.5, Math.min(8, start.imageScale * scale));
  const ratio = imageScale / start.imageScale;
  return {
    imageScale,
    imagePosition: {
      x:
        current.x -
        center.x -
        (focal.x - center.x - start.imagePosition.x) * ratio,
      y:
        current.y -
        center.y -
        (focal.y - center.y - start.imagePosition.y) * ratio,
    },
  };
}

/** SVG 内部变换保持根视窗固定，平移时不会裁掉原本在屏幕外的标注。 */
export function viewportMatrix(
  current: Viewport,
  rendered: Viewport,
  center: Point
): [number, number, number, number, number, number] {
  'worklet';
  const scale = current.imageScale / rendered.imageScale;
  return [
    scale,
    0,
    0,
    scale,
    center.x * (1 - scale) +
      current.imagePosition.x -
      rendered.imagePosition.x * scale,
    center.y * (1 - scale) +
      current.imagePosition.y -
      rendered.imagePosition.y * scale,
  ];
}
