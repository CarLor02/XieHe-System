import {
  getMeasurementPointDragConstraint,
  imageToScreen,
  isDynamicShapeTool,
  planDynamicShapeCompletion,
  screenToImage,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import type { Point } from '@xiehe/imaging-core/contracts';
import type { ImageEditorSession } from '../../application/ImageEditorSession';
import { findSelection, selectionAnchor } from './selection';
import type { DragPlan, PanSample, Viewport } from './canvasGestureModel';

/** JS 应用适配器。手势帧只传绝对位置；事务、联动和最终提交全部留在会话中。 */
export class CanvasInteraction {
  private drag:
    | { kind: 'annotation'; offset: Point }
    | { kind: 'shape'; start: Point }
    | null = null;
  private gestureId: number | null = null;
  private context: TransformContext | null = null;
  private disposed = false;

  constructor(readonly session: ImageEditorSession) {}

  begin(id: number, event: PanSample, context: TransformContext): DragPlan {
    this.cancel();
    if (this.disposed)
      return { kind: 'viewport', origin: context.imagePosition };
    this.gestureId = id;
    this.context = context;
    const start = {
      x: event.x - event.translationX,
      y: event.y - event.translationY,
    };
    const point = screenToImage(start.x, start.y, context);
    const state = this.session.getState();
    if (this.session.editable && isDynamicShapeTool(state.tool)) {
      this.drag = { kind: 'shape', start: point };
      return { kind: 'shape' };
    }
    const selection =
      this.session.editable && !state.drawing
        ? findSelection(this.session, start, context)
        : null;
    if (!selection) return { kind: 'viewport', origin: context.imagePosition };
    const anchor = selectionAnchor(this.session, selection, point);
    const offset = { x: point.x - anchor.x, y: point.y - anchor.y };
    this.drag = { kind: 'annotation', offset };
    this.session.beginDrag(selection);
    const origin = imageToScreen({ x: 0, y: 0 }, context);
    const unit = imageToScreen({ x: 1, y: 0 }, context);
    const measurement =
      selection.kind === 'point'
        ? this.session.snapshot?.measurements.find(
            item => item.id === selection.measurementId
          )
        : null;
    return {
      kind: 'annotation',
      selection,
      offset,
      origin,
      pixelsPerUnit: unit.x - origin.x,
      fixed:
        measurement && selection.kind === 'point'
          ? getMeasurementPointDragConstraint(measurement, selection.pointIndex)
          : {},
    };
  }

  move(id: number, event: PanSample) {
    if (this.disposed || id !== this.gestureId || !this.context || !this.drag)
      return;
    const point = screenToImage(event.x, event.y, this.context);
    if (this.drag.kind === 'annotation') {
      this.session.moveDrag({
        x: point.x - this.drag.offset.x,
        y: point.y - this.drag.offset.y,
      });
    } else {
      this.session.previewShape(
        planDynamicShapeCompletion(
          this.session.getState().tool,
          this.drag.start,
          point
        )?.points ?? []
      );
    }
  }

  end(id: number, final: PanSample): Viewport | null {
    if (id !== this.gestureId || this.disposed || !this.context) return null;
    const viewport = !this.drag
      ? {
          imageScale: this.context.imageScale,
          imagePosition: {
            x: this.context.imagePosition.x + final.translationX,
            y: this.context.imagePosition.y + final.translationY,
          },
        }
      : null;
    // 松手位置可能比最后一帧更新更晚，必须先刷新再写入唯一一条历史记录。
    this.move(id, final);
    if (this.drag?.kind === 'annotation') this.session.endDrag();
    else if (
      this.drag?.kind === 'shape' &&
      this.session.getState().drawingPreview.length >= 2
    )
      this.session.finishDrawing(this.session.getState().drawingPreview);
    this.drag = null;
    this.gestureId = null;
    return viewport;
  }

  cancel(id?: number) {
    if (id !== undefined && id !== this.gestureId) return;
    if (this.drag?.kind === 'annotation') this.session.cancelDrag();
    if (this.drag?.kind === 'shape') this.session.previewShape([]);
    this.drag = null;
    this.gestureId = null;
  }

  tap(event: Point, context: TransformContext) {
    if (this.disposed || !this.session.editable) return;
    const point = screenToImage(event.x, event.y, context);
    if (this.session.getState().drawing) {
      const size = context.imageNaturalSize!;
      if (
        point.x < 0 ||
        point.y < 0 ||
        point.x > size.width ||
        point.y > size.height
      )
        return;
      const origin = imageToScreen({ x: 0, y: 0 }, context),
        unit = imageToScreen({ x: 1, y: 0 }, context);
      this.session.placePoint(point, unit.x - origin.x);
    } else this.session.select(findSelection(this.session, event, context));
  }

  activate() {
    this.disposed = false;
  }
  dispose() {
    this.cancel();
    this.disposed = true;
  }
}
