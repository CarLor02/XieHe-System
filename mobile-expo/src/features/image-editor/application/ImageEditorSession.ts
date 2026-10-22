import { getApiErrorMessage, getApiErrorStatus } from '@xiehe/api-client';
import type { ImageFileResponse } from '@xiehe/api-contracts/generated';
import { runAiMeasurement } from '@xiehe/imaging-core/ai';
import { runMeasurementReport } from '@xiehe/imaging-core/reports';
import {
  getAnnotationConfig,
  getDescriptionForType,
  getAnnotationTypeId,
} from '@xiehe/imaging-catalog/annotations';
import { getToolsForExamType } from '@xiehe/imaging-catalog/tools';
import {
  decodeAnnotationDocument,
  runAnnotationSave,
} from '@xiehe/imaging-core/annotation-document';
import {
  createEmptyBindings,
  validateAnnotationBindings,
} from '@xiehe/imaging-core/bindings';
import type { ImageSize, Point } from '@xiehe/imaging-core/contracts';
import {
  areAnnotationEditorSnapshotsEqual,
  beginAnnotationHistoryAction,
  cloneAnnotationEditorSnapshot,
  createAnnotationHistoryState,
  observeAnnotationHistoryPresent,
  prepareStudyEditorState,
  redoAnnotationHistory,
  undoAnnotationHistory,
  type AnnotationEditorSnapshot,
  type AnnotationHistoryState,
} from '@xiehe/imaging-core/editor';
import { deleteKeypoints } from '@xiehe/imaging-core/keypoints';
import { planMeasurementDeletion } from '@xiehe/imaging-core/measurement-keypoint-sync';
import {
  hasUniqueAnnotationForTool,
  measurementMatchesTool,
  renumberCobbMeasurementsAfterDelete,
} from '@xiehe/imaging-core/measurements';
import {
  createAvtPlacementSession,
  getAvtTargetKey,
  isAvtMetadata,
} from '@xiehe/imaging-core/measurements/ap';
import type { PointRef } from '@xiehe/imaging-core/bindings';
import { bindSelectedPoints } from './manualBindings';
import { dragAnnotation, type EditorSelection } from './dragAnnotation';
import { recalculateSnapshot, synchronizeKeypoints } from './editorSnapshot';
import { measurementCalculator } from './measurementValues';
import {
  completeDrawing,
  drawingHint,
  placeDrawingPoint,
  startDrawing,
  type DrawingOptions,
  type DrawingSession,
} from './drawingSession';
import type { EditorPreview, ImageEditorGateway } from './ports';

export interface EditorState {
  status: 'loading' | 'ready' | 'error';
  image: ImageFileResponse | null;
  preview: EditorPreview | null;
  imageSize: ImageSize | null;
  imageReady: boolean;
  history: AnnotationHistoryState<AnnotationEditorSnapshot> | null;
  annotationVersion: number;
  reportText: string;
  dirty: boolean;
  saving: boolean;
  working: 'ai' | 'report' | null;
  conflict: boolean;
  error: string;
  message: string;
  tool: string;
  drawing: DrawingSession | null;
  drawingPreview: Point[];
  selection: EditorSelection | null;
  dragging: boolean;
}

const historyPolicy = {
  clone: cloneAnnotationEditorSnapshot,
  equals: areAnnotationEditorSnapshotsEqual,
  maxDepth: 60,
};

/** 移动端的编辑会话：网络生命周期、草稿、历史与版本化保存；不依赖 React 或原生组件。 */
export class ImageEditorSession {
  private state: EditorState = {
    status: 'loading',
    image: null,
    preview: null,
    imageSize: null,
    imageReady: false,
    history: null,
    annotationVersion: 0,
    reportText: '',
    dirty: false,
    saving: false,
    working: null,
    conflict: false,
    error: '',
    message: '',
    tool: 'hand',
    drawing: null,
    drawingPreview: [],
    selection: null,
    dragging: false,
  };
  private listeners = new Set<() => void>();
  private generation = 0;
  private sequence = 0;
  private savedReport = '';
  private savedSnapshot: AnnotationEditorSnapshot | null = null;
  private drawingBase: AnnotationEditorSnapshot | null = null;
  private dragBase: AnnotationEditorSnapshot | null = null;

  constructor(
    readonly imageId: number,
    private gateway: ImageEditorGateway
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getState = () => this.state;
  get snapshot() {
    return this.state.history?.present ?? null;
  }
  get editable() {
    return (
      this.state.status === 'ready' &&
      this.state.imageReady &&
      !!this.state.imageSize &&
      !this.state.saving &&
      !this.state.working &&
      !this.state.conflict
    );
  }
  get canAnalyze() {
    return (
      this.state.status === 'ready' &&
      this.state.imageReady &&
      !this.state.saving &&
      !this.state.working &&
      !this.state.conflict &&
      !this.state.drawing &&
      !this.state.dragging
    );
  }
  get context() {
    return {
      examType: this.state.image?.description ?? '',
      imageNaturalSize: this.state.imageSize,
      standardDistance: this.snapshot?.standardDistance ?? null,
      standardDistancePoints: this.snapshot?.standardDistancePoints ?? [],
    };
  }
  get hint() {
    return this.state.drawing && this.snapshot
      ? drawingHint(this.state.drawing, this.snapshot)
      : this.state.tool === 'keypoint'
        ? '拖动已有关键点 · 相关测量自动更新'
        : '点选测量 · 拖动控制点修改 · 双指缩放和平移';
  }
  private update(patch: Partial<EditorState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private commit(snapshot: AnnotationEditorSnapshot) {
    const history = this.state.history;
    if (!history) return;
    const begun = beginAnnotationHistoryAction(
      history,
      '编辑标注',
      { id: ++this.sequence },
      historyPolicy
    );
    this.update({
      history: observeAnnotationHistoryPresent(begun, snapshot, historyPolicy),
      dirty:
        !this.savedSnapshot ||
        !historyPolicy.equals(snapshot, this.savedSnapshot) ||
        this.state.reportText !== this.savedReport,
      message: '',
      error: '',
    });
  }
  cancelPending = () => {
    this.generation += 1;
  };

  async load() {
    const generation = ++this.generation;
    this.update({
      status: 'loading',
      error: '',
      imageReady: false,
      saving: false,
      working: null,
      drawing: null,
      drawingPreview: [],
      selection: null,
      dragging: false,
    });
    this.dragBase = this.drawingBase = null;
    try {
      if (!Number.isSafeInteger(this.imageId) || this.imageId <= 0)
        throw new Error('无效的影像编号');
      const image = await this.gateway.getImage(this.imageId);
      const prepared = prepareStudyEditorState({
        source: image,
        normalizeMeasurementType: getAnnotationTypeId,
      });
      const document = decodeAnnotationDocument(image.annotation);
      const preview = await this.gateway.getPreview(image);
      if (generation !== this.generation) return;
      const snapshot: AnnotationEditorSnapshot = {
        measurements: prepared.measurements,
        standardDistance: prepared.standardDistance,
        standardDistanceValue: String(prepared.standardDistance ?? ''),
        standardDistancePoints: prepared.standardDistancePoints,
        pointBindings: prepared.pointBindings,
        ...prepared.keypointState,
        aiMeasurementIds: [],
      };
      this.savedSnapshot = historyPolicy.clone(snapshot);
      this.savedReport = prepared.reportText;
      // 坐标空间属于文档。缩略图的像素大小只参与显示，绝不能替换原图坐标。
      const imageSize =
        document?.imageWidth && document.imageHeight
          ? { width: document.imageWidth, height: document.imageHeight }
          : null;
      this.update({
        status: 'ready',
        image,
        preview,
        imageSize,
        history: createAnnotationHistoryState(snapshot, historyPolicy),
        annotationVersion: prepared.annotationVersion,
        reportText: prepared.reportText,
        dirty: false,
        conflict: false,
        message: '',
        tool: 'hand',
      });
    } catch (cause) {
      if (generation === this.generation)
        this.update({
          status: 'error',
          error: getApiErrorMessage(cause, '影像标注加载失败'),
        });
    }
  }

  imageLoaded(size: ImageSize, previewUri = this.state.preview?.uri) {
    if (this.state.status !== 'ready' || previewUri !== this.state.preview?.uri)
      return;
    if (!(size.width > 0 && size.height > 0)) return;
    const imageSize =
      this.state.imageSize ?? (this.state.preview?.isThumbnail ? null : size);
    this.update({
      imageReady: true,
      imageSize,
      error: imageSize
        ? ''
        : '该影像的旧标注未记录原图尺寸，当前预览只能查看。请先在 Web 打开并保存一次，再重新读取。',
    });
  }
  imageFailed(previewUri = this.state.preview?.uri) {
    if (this.state.status !== 'ready' || previewUri !== this.state.preview?.uri)
      return;
    this.update({
      imageReady: false,
      error: '影像加载失败，请重新读取影像后重试',
    });
  }
  select(selection: EditorSelection | null) {
    if (!this.state.saving) this.update({ selection });
  }

  chooseTool(toolId: string, options: DrawingOptions = {}) {
    if (!this.editable) return;
    this.cancelDrawing();
    this.cancelDrag();
    this.update({ message: '', error: '' });
    if (toolId === 'hand' || toolId === 'keypoint') {
      this.update({ tool: toolId, selection: null });
      return;
    }
    const snapshot = this.snapshot!;
    if (toolId === 'avt' && options.avtTarget) {
      const targetKey = getAvtTargetKey(options.avtTarget);
      const existing = snapshot.measurements.find(
        item =>
          isAvtMetadata(item.avtMetadata) &&
          getAvtTargetKey(item.avtMetadata.target) === targetKey
      );
      if (existing) {
        this.update({
          selection: { kind: 'whole', measurementId: existing.id },
          message: '该 AVT 目标已存在，已选中；拖动控制点即可修改',
        });
        return;
      }
    }
    const tool = getToolsForExamType(this.context.examType).find(
      t => t.id === toolId
    );
    if (tool && hasUniqueAnnotationForTool(snapshot.measurements, tool)) {
      const existing = snapshot.measurements.find(m =>
        measurementMatchesTool(m, tool)
      )!;
      this.update({
        tool: 'hand',
        selection: { kind: 'whole', measurementId: existing.id },
        message: '该测量已存在，已选中；拖动控制点即可修改',
      });
      return;
    }
    try {
      const drawing = startDrawing(
        toolId,
        snapshot,
        this.context.examType,
        options
      );
      this.drawingBase = historyPolicy.clone(snapshot);
      this.update({ tool: toolId, drawing, selection: null });
      if (
        drawing.avtTarget &&
        !createAvtPlacementSession(
          drawing.avtTarget,
          new Set(snapshot.keypoints.map(k => k.id))
        )
      )
        this.finishDrawing([]);
      else if (
        drawing.pointsNeeded > 0 &&
        drawing.inherited.size === drawing.pointsNeeded
      )
        this.finishDrawing(
          Array.from({ length: drawing.pointsNeeded }, (_, index) =>
            drawing.inherited.get(index)!
          )
        );
    } catch (cause) {
      this.update({ error: getApiErrorMessage(cause) });
    }
  }
  placePoint(point: Point, pixelsPerImageUnit: number) {
    if (!this.editable || !this.snapshot || !this.state.drawing) return;
    const result = placeDrawingPoint(
      this.state.drawing,
      this.snapshot,
      point,
      pixelsPerImageUnit
    );
    this.update({
      drawing: result.session,
      history: { ...this.state.history!, present: result.snapshot },
    });
    if (result.completion !== null) this.finishDrawing(result.completion);
  }
  previewShape(points: Point[]) {
    if (this.editable) this.update({ drawingPreview: points });
  }
  finishDrawing(points: Point[] = this.state.drawing?.points ?? []) {
    const drawing = this.state.drawing;
    if (!this.editable || !drawing || !this.snapshot) return;
    if (drawing.toolId === 'polygon' && points.length < 3) return;
    if (
      drawing.toolId === 'calibration' &&
      Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) < 0.001
    ) {
      this.update({ error: '标尺的两个端点不能重合，请重新放置' });
      this.cancelDrawing();
      return;
    }
    try {
      const completed = completeDrawing(
        drawing,
        this.snapshot,
        points,
        this.context,
        () => `mobile-${Date.now()}-${++this.sequence}`
      );
      const next =
        drawing.toolId === 'calibration'
          ? recalculateSnapshot(completed, {
              ...this.context,
              standardDistancePoints: points,
            })
          : completed;
      // 多次落点及补充关键点作为一次完整操作进入历史，取消时回到落点前。
      if (this.drawingBase)
        this.state = {
          ...this.state,
          history: { ...this.state.history!, present: this.drawingBase },
        };
      this.drawingBase = null;
      this.update({ drawing: null, drawingPreview: [], tool: 'hand' });
      this.commit(next);
    } catch (cause) {
      this.cancelDrawing();
      this.update({ error: getApiErrorMessage(cause) });
    }
  }
  cancelDrawing() {
    const present = this.drawingBase;
    this.drawingBase = null;
    this.update({
      drawing: null,
      drawingPreview: [],
      tool: 'hand',
      ...(present && this.state.history
        ? { history: { ...this.state.history, present } }
        : {}),
    });
  }

  beginDrag(selection: EditorSelection) {
    if (!this.editable || this.state.drawing || !this.snapshot) return;
    this.dragBase = historyPolicy.clone(this.snapshot);
    this.update({ selection, dragging: true });
  }
  moveDrag(point: Point) {
    if (!this.dragBase || !this.state.selection || !this.editable) return;
    const present = dragAnnotation(
      this.dragBase,
      this.state.selection,
      point,
      this.context
    );
    this.update({ history: { ...this.state.history!, present } });
  }
  endDrag() {
    const base = this.dragBase;
    if (!base || !this.snapshot) return;
    const next = this.snapshot;
    this.dragBase = null;
    this.update({
      dragging: false,
      history: { ...this.state.history!, present: base },
    });
    this.commit(next);
  }
  cancelDrag() {
    const base = this.dragBase;
    this.dragBase = null;
    this.update({
      dragging: false,
      ...(base && this.state.history
        ? { history: { ...this.state.history, present: base } }
        : {}),
    });
  }
  undo() {
    this.restoreHistory(false);
  }
  redo() {
    this.restoreHistory(true);
  }
  private restoreHistory(redo: boolean) {
    if (!this.editable) return;
    this.cancelDrawing();
    this.cancelDrag();
    const restored = (redo ? redoAnnotationHistory : undoAnnotationHistory)(
      this.state.history!,
      historyPolicy
    );
    this.update({
      history: restored.state,
      selection: null,
      dirty:
        !historyPolicy.equals(restored.state.present, this.savedSnapshot!) ||
        this.state.reportText !== this.savedReport,
      error: '',
      message: '',
    });
  }
  setStandardDistance(value: string) {
    if (!this.editable || !this.snapshot || this.state.drawing) return;
    const distance = Number(value);
    if (!Number.isFinite(distance) || distance <= 0) {
      this.update({ error: '请输入大于 0 的标准距离（mm）' });
      return;
    }
    const next = {
      ...this.snapshot,
      standardDistance: distance,
      standardDistanceValue: String(distance),
    };
    this.commit(
      recalculateSnapshot(next, { ...this.context, standardDistance: distance })
    );
  }
  deleteSelected() {
    if (
      !this.editable ||
      !this.snapshot ||
      !this.state.selection ||
      !('measurementId' in this.state.selection)
    )
      return;
    this.cancelDrag();
    this.cancelDrawing();
    const snapshot = this.snapshot;
    const plan = planMeasurementDeletion(
      snapshot.measurements,
      this.state.selection.measurementId,
      this.context.examType
    );
    const keypoints = deleteKeypoints(
      snapshot.keypoints,
      plan.keypointIdsToDelete
    );
    const measurements = renumberCobbMeasurementsAfterDelete(
      snapshot.measurements.filter(
        m => !plan.measurementIdsToDelete.includes(m.id)
      ),
      this.context,
      measurementCalculator
    );
    const next = {
      ...snapshot,
      measurements,
      pointBindings: validateAnnotationBindings(
        snapshot.pointBindings,
        measurements
      ),
    };
    this.commit(
      keypoints.length !== snapshot.keypoints.length
        ? synchronizeKeypoints(next, keypoints, this.context)
        : next
    );
    this.update({ selection: null });
  }
  clear() {
    if (!this.editable || !this.snapshot) return;
    this.cancelDrawing();
    this.cancelDrag();
    this.commit({
      ...this.snapshot,
      measurements: [],
      keypoints: [],
      vertebraeLayer: [],
      cfhAnnotation: null,
      aiMeasurementIds: [],
      pointBindings: createEmptyBindings(),
    });
    this.update({ selection: null });
  }
  bindPoints(points: PointRef[]): boolean {
    if (
      !this.editable ||
      !this.snapshot ||
      this.state.drawing ||
      this.state.dragging
    )
      return false;
    try {
      this.commit(
        bindSelectedPoints(
          this.snapshot,
          points,
          `manual-${this.imageId}-${Date.now()}-${++this.sequence}`,
          this.context
        )
      );
      return true;
    } catch (cause) {
      this.update({ error: getApiErrorMessage(cause) });
      return false;
    }
  }
  removeBinding(id?: string) {
    if (!this.editable || !this.snapshot) return;
    this.commit({
      ...this.snapshot,
      pointBindings: {
        ...this.snapshot.pointBindings,
        syncGroups: id
          ? this.snapshot.pointBindings.syncGroups.filter(
              group => group.id !== id
            )
          : [],
      },
    });
  }

  setReportText(reportText: string) {
    if (!this.editable || !this.snapshot) return;
    this.update({
      reportText,
      dirty:
        reportText !== this.savedReport ||
        !this.savedSnapshot ||
        !historyPolicy.equals(this.snapshot, this.savedSnapshot),
    });
  }

  async analyze(): Promise<boolean> {
    if (!this.canAnalyze || !this.snapshot) return false;
    const generation = this.generation;
    const base = historyPolicy.clone(this.snapshot);
    this.update({ working: 'ai', error: '', message: '' });
    try {
      // 与 Web 一致：AI 替换测量及检测层，清空手动绑定；用户核对后才保存。
      const result = await runAiMeasurement({
        imageId: this.imageId,
        examType: this.context.examType,
        actualImageSize: this.state.imageSize,
        port: this.gateway,
        resolveTool: type => {
          const tool = getAnnotationConfig(type);
          return tool
            ? {
                id: tool.id,
                category:
                  tool.category === 'measurement' ? 'measurement' : 'support',
                pointsNeeded: tool.pointsNeeded,
              }
            : null;
        },
        calculateValue: (type, points) =>
          measurementCalculator.calculateType(type, points, {
            ...this.context,
            standardDistance: null,
            standardDistancePoints: [],
          }),
        describeType: getDescriptionForType,
        createId: () => `ai-${this.imageId}-${++this.sequence}`,
      });
      if (generation !== this.generation) return false;
      if (result.status === 'empty' || !result.state.measurements.length)
        throw new Error('AI 未返回有效测量，已保留当前标注');
      const prepared = result.state;
      if (
        !prepared.imageSize ||
        prepared.imageSize.width <= 0 ||
        prepared.imageSize.height <= 0
      )
        throw new Error('AI 未返回原图尺寸，已保留当前标注');
      // TIFF 预览不能提供坐标尺寸；模型返回的原图尺寸可建立首次标注坐标系。
      this.update({ imageSize: prepared.imageSize });
      this.commit({
        ...base,
        measurements: prepared.measurements,
        keypoints: prepared.keypoints,
        vertebraeLayer: prepared.vertebraeLayer,
        cfhAnnotation: prepared.cfhAnnotation,
        pointBindings: createEmptyBindings(),
        aiMeasurementIds: prepared.measurements.map(m => m.id),
      });
      this.update({
        selection: null,
        tool: 'hand',
        message: 'AI 测量已载入，请核对点位后保存；可撤销此次替换',
      });
      return true;
    } catch (cause) {
      if (generation === this.generation)
        this.update({ error: getApiErrorMessage(cause, 'AI 测量失败') });
      return false;
    } finally {
      if (generation === this.generation) this.update({ working: null });
    }
  }

  async generateReport(): Promise<boolean> {
    if (
      !this.editable ||
      !this.snapshot ||
      this.state.drawing ||
      this.state.dragging
    )
      return false;
    const generation = this.generation;
    this.update({ working: 'report', error: '', message: '' });
    try {
      const result = await runMeasurementReport({
        study: {
          imageId: String(this.imageId),
          examType: this.context.examType,
        },
        measurements: this.snapshot.measurements,
        port: this.gateway,
      });
      if (generation !== this.generation) return false;
      if (result.status === 'empty') throw new Error(result.message);
      this.update({
        reportText: result.report,
        dirty: true,
        message: '报告已生成，保存标注时将一并保存',
      });
      return true;
    } catch (cause) {
      if (generation === this.generation)
        this.update({ error: getApiErrorMessage(cause, '报告生成失败') });
      return false;
    } finally {
      if (generation === this.generation) this.update({ working: null });
    }
  }

  async save(): Promise<boolean> {
    if (!this.editable || !this.snapshot) return false;
    if (this.state.drawing || this.state.dragging) {
      this.update({ error: '请先完成或取消当前绘图，再保存' });
      return false;
    }
    const generation = this.generation;
    const snapshot = historyPolicy.clone(this.snapshot);
    this.update({ saving: true, error: '', message: '' });
    try {
      const { result, plan } = await runAnnotationSave({
        imageId: this.imageId,
        expectedVersion: this.state.annotationVersion,
        snapshot: {
          ...snapshot,
          imageNaturalSize: this.state.imageSize,
          reportText: this.state.reportText,
          savedAt: new Date().toISOString(),
        },
        port: this.gateway,
      });
      if (generation !== this.generation) return false;
      this.savedSnapshot = snapshot;
      this.savedReport = this.state.reportText;
      this.update({
        annotationVersion: result.annotation_version,
        dirty: false,
        message: plan.successMessage,
      });
      return true;
    } catch (cause) {
      if (generation === this.generation)
        this.update({
          conflict: getApiErrorStatus(cause) === 409,
          error:
            getApiErrorStatus(cause) === 409
              ? '该影像已被其他端修改，当前草稿仍保留。请重新读取最新版本后编辑，避免覆盖他人的标注。'
              : getApiErrorMessage(cause, '保存失败，请重试'),
        });
      return false;
    } finally {
      if (generation === this.generation) this.update({ saving: false });
    }
  }
}
