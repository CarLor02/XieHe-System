import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  calculatePinchViewport,
  hitTestCanvasMeasurement,
  imageToScreen,
  isDynamicShapeTool,
  planDynamicShapeCompletion,
  screenToImage,
  type PinchSnapshot,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import {
  getAnnotationConfig,
  getInteractivePointsCount,
  isEditableAuxiliaryAnnotationType,
} from '@xiehe/imaging-catalog/annotations';
import type { ImageSize, Point } from '@xiehe/imaging-core/contracts';
import { getBoundingBoxCenter } from '@xiehe/imaging-core/geometry';
import { getBilateralPelvicGeometryForMeasurement } from '@xiehe/imaging-core/measurements/lateral';
import { resolveTtsMeasurement } from '@xiehe/imaging-core/measurements/ap';
import type {
  ImageEditorSession,
  EditorState,
} from '../application/ImageEditorSession';
import type { EditorSelection } from '../application/dragAnnotation';
import { AnnotationOverlay } from './AnnotationOverlay';
import { EditorButton } from './EditorButton';
import { editorColors as c } from './editorTheme';

type Viewport = { imageScale: number; imagePosition: Point };
type CanvasDrag =
  | { kind: 'viewport'; position: Point }
  | { kind: 'annotation'; offset: Point }
  | { kind: 'shape'; start: Point }
  | null;

function findSelection(
  session: ImageEditorSession,
  screenPoint: Point,
  context: TransformContext
): EditorSelection | null {
  const snapshot = session.snapshot;
  if (!snapshot) return null;
  const project = (point: Point) => imageToScreen(point, context);
  if (session.getState().tool === 'keypoint') {
    const keypoint = snapshot.keypoints
      .map(k => ({ keypoint: k, screen: project(k.point) }))
      .sort(
        (a, b) =>
          Math.hypot(a.screen.x - screenPoint.x, a.screen.y - screenPoint.y) -
          Math.hypot(b.screen.x - screenPoint.x, b.screen.y - screenPoint.y)
      )
      .find(
        k =>
          Math.hypot(k.screen.x - screenPoint.x, k.screen.y - screenPoint.y) <
          22
      );
    return keypoint
      ? { kind: 'keypoint', keypointId: keypoint.keypoint.id }
      : null;
  }
  const selected = session.getState().selection;
  const measurements = [...snapshot.measurements].sort(
    (a, b) =>
      Number(
        !!selected &&
          'measurementId' in selected &&
          selected.measurementId === b.id
      ) -
      Number(
        !!selected &&
          'measurementId' in selected &&
          selected.measurementId === a.id
      )
  );
  const hit = hitTestCanvasMeasurement({
    measurements,
    examType: session.context.examType,
    screenPoint,
    imageToScreen: project,
    context,
    pointRadius: 20,
    lineRadius: 12,
    policy: {
      getInteractivePointsCount,
      isEditableAuxiliary: isEditableAuxiliaryAnnotationType,
      hitTestLabel: measurement => {
        const point = screenToImage(screenPoint.x, screenPoint.y, context);
        const origin = project({ x: 0, y: 0 }),
          unit = project({ x: 1, y: 0 });
        const tolerance = 12 / Math.max(0.001, unit.x - origin.x);
        return (
          getAnnotationConfig(measurement.type)?.isInSelectionRange(
            point,
            measurement.points,
            tolerance
          ) ?? false
        );
      },
    },
  });
  if (hit.kind !== 'none')
    return hit.kind === 'label'
      ? { kind: 'whole', measurementId: hit.measurementId }
      : hit;
  const calibration = snapshot.standardDistancePoints.findIndex(point => {
    const p = project(point);
    return Math.hypot(p.x - screenPoint.x, p.y - screenPoint.y) < 20;
  });
  return calibration >= 0
    ? { kind: 'calibration', pointIndex: calibration }
    : null;
}

function selectionAnchor(
  session: ImageEditorSession,
  selection: EditorSelection,
  fallback: Point
): Point {
  const snapshot = session.snapshot!;
  if (selection.kind === 'calibration')
    return snapshot.standardDistancePoints[selection.pointIndex];
  if (selection.kind === 'keypoint')
    return (
      snapshot.keypoints.find(k => k.id === selection.keypointId)?.point ??
      fallback
    );
  const measurement = snapshot.measurements.find(
    m => m.id === selection.measurementId
  );
  if (!measurement) return fallback;
  if (selection.kind === 'point')
    return measurement.points[selection.pointIndex];
  if (selection.kind === 'effective-cfh')
    return (
      getBilateralPelvicGeometryForMeasurement(measurement)
        ?.femoralHeadCenter ?? fallback
    );
  if (selection.kind === 'line') return fallback;
  const tts = resolveTtsMeasurement(measurement);
  return getBoundingBoxCenter(
    tts?.layout === 'manual' ? [...tts.trunkPoints] : measurement.points
  );
}

class CanvasInteraction {
  context: TransformContext = {
    imageNaturalSize: null,
    containerSize: null,
    imageScale: 1,
    imagePosition: { x: 0, y: 0 },
  };
  drag: CanvasDrag = null;
  pinchStart: PinchSnapshot | null = null;
  pinching = false;
  suppressTap = false;
  constructor(
    readonly session: ImageEditorSession,
    private setViewport: (viewport: Viewport) => void
  ) {}
  updateContext(context: TransformContext) {
    this.context = context;
  }
  beginTouch() {
    this.suppressTap = false;
  }
  touchDown(pointerCount: number) {
    if (pointerCount < 2) return;
    // 双指手势结束时不能落入一次普通点击，也不能提交被打断的单点拖动。
    this.suppressTap = true;
    this.cancelPan();
  }
  applyViewport(next: Viewport) {
    this.context = { ...this.context, ...next };
    this.setViewport(next);
  }
  beginPan(event: {
    x: number;
    y: number;
    translationX: number;
    translationY: number;
  }) {
    if (this.pinching) return;
    const start = {
      x: event.x - event.translationX,
      y: event.y - event.translationY,
    };
    const point = screenToImage(start.x, start.y, this.context);
    const tool = this.session.getState().tool;
    if (this.session.editable && isDynamicShapeTool(tool)) {
      this.drag = { kind: 'shape', start: point };
      return;
    }
    const selected =
      this.session.editable && !this.session.getState().drawing
        ? findSelection(this.session, start, this.context)
        : null;
    if (selected) {
      const anchor = selectionAnchor(this.session, selected, point);
      this.drag = {
        kind: 'annotation',
        offset: { x: point.x - anchor.x, y: point.y - anchor.y },
      };
      this.session.beginDrag(selected);
    } else
      this.drag = {
        kind: 'viewport',
        position: { ...this.context.imagePosition },
      };
  }
  movePan(event: {
    x: number;
    y: number;
    translationX: number;
    translationY: number;
    numberOfPointers: number;
  }) {
    if (event.numberOfPointers !== 1 || this.pinching || !this.drag) return;
    if (this.drag.kind === 'viewport') {
      this.applyViewport({
        imageScale: this.context.imageScale,
        imagePosition: {
          x: this.drag.position.x + event.translationX,
          y: this.drag.position.y + event.translationY,
        },
      });
      return;
    }
    const point = screenToImage(event.x, event.y, this.context);
    if (this.drag.kind === 'annotation')
      this.session.moveDrag({
        x: point.x - this.drag.offset.x,
        y: point.y - this.drag.offset.y,
      });
    else
      this.session.previewShape(
        planDynamicShapeCompletion(
          this.session.getState().tool,
          this.drag.start,
          point
        )?.points ?? []
      );
  }
  endPan(success: boolean) {
    if (!success || this.pinching) return;
    if (this.drag?.kind === 'annotation') this.session.endDrag();
    else if (
      this.drag?.kind === 'shape' &&
      this.session.getState().drawingPreview.length >= 2
    )
      this.session.finishDrawing(this.session.getState().drawingPreview);
    this.drag = null;
  }
  cancelPan() {
    if (this.drag?.kind === 'annotation') this.session.cancelDrag();
    this.session.previewShape([]);
    this.drag = null;
  }
  tap(event: { x: number; y: number }, success: boolean) {
    if (!success || this.pinching || this.suppressTap || !this.session.editable)
      return;
    const point = screenToImage(event.x, event.y, this.context);
    if (this.session.getState().drawing) {
      const size = this.context.imageNaturalSize!;
      if (
        point.x < 0 ||
        point.y < 0 ||
        point.x > size.width ||
        point.y > size.height
      )
        return;
      const a = imageToScreen({ x: 0, y: 0 }, this.context),
        b = imageToScreen({ x: 1, y: 0 }, this.context);
      this.session.placePoint(point, b.x - a.x);
    } else
      this.session.select(findSelection(this.session, event, this.context));
  }
  beginPinch(event: { focalX: number; focalY: number }) {
    this.suppressTap = true;
    this.pinching = true;
    this.session.cancelDrag();
    this.session.previewShape([]);
    this.drag = null;
    const size = this.context.containerSize!;
    this.pinchStart = {
      distance: 1,
      midpoint: { x: event.focalX, y: event.focalY },
      imageScale: this.context.imageScale,
      imagePosition: this.context.imagePosition,
      containerCenter: { x: size.width / 2, y: size.height / 2 },
    };
  }
  movePinch(event: { scale: number; focalX: number; focalY: number }) {
    if (this.pinchStart)
      this.applyViewport(
        calculatePinchViewport(
          this.pinchStart,
          { x: event.focalX - event.scale / 2, y: event.focalY },
          { x: event.focalX + event.scale / 2, y: event.focalY },
          0.5,
          8
        )
      );
  }
  endPinch() {
    this.pinching = false;
    this.pinchStart = null;
  }
  zoom(multiplier: number) {
    this.applyViewport({
      imagePosition: this.context.imagePosition,
      imageScale: Math.max(
        0.5,
        Math.min(8, this.context.imageScale * multiplier)
      ),
    });
  }
}

export function EditorCanvas({
  session,
  state,
  showLabels,
  showKeypoints,
  controls,
}: {
  session: ImageEditorSession;
  state: EditorState;
  showLabels: boolean;
  showKeypoints: boolean;
  controls: ReactNode;
}) {
  const [container, setContainer] = useState<ImageSize>({
    width: 1,
    height: 1,
  });
  const [rasterSize, setRasterSize] = useState<ImageSize | null>(null);
  const [viewport, setViewport] = useState<Viewport>({
    imageScale: 1,
    imagePosition: { x: 0, y: 0 },
  });
  const context: TransformContext = {
    ...viewport,
    containerSize: container,
    imageNaturalSize: state.imageSize ?? rasterSize,
  };
  const interaction = useMemo(
    () => new CanvasInteraction(session, setViewport),
    [session]
  );
  useLayoutEffect(() => {
    interaction.updateContext(context);
  });
  const gestures = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDistance(8)
      .maxDuration(450)
      .runOnJS(true)
      .onBegin(() => interaction.beginTouch())
      .onTouchesDown(event => interaction.touchDown(event.numberOfTouches))
      .onEnd((event, success) => interaction.tap(event, success));
    const pan = Gesture.Pan()
      .maxPointers(1)
      .minDistance(4)
      .runOnJS(true)
      .onTouchesDown(event => interaction.touchDown(event.numberOfTouches))
      .onStart(event => interaction.beginPan(event))
      .onUpdate(event => interaction.movePan(event))
      .onEnd((_event, success) => interaction.endPan(success))
      .onFinalize(() => interaction.cancelPan());
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(event => interaction.beginPinch(event))
      .onUpdate(event => interaction.movePinch(event))
      .onFinalize(() => interaction.endPinch());
    return Gesture.Simultaneous(pinch, Gesture.Exclusive(pan, tap));
  }, [interaction]);
  const size = context.imageNaturalSize;
  const origin = size ? imageToScreen({ x: 0, y: 0 }, context) : { x: 0, y: 0 };
  const bottom = size
    ? imageToScreen({ x: size.width, y: size.height }, context)
    : { x: container.width, y: container.height };
  const preview = state.drawingPreview.length
    ? {
        id: 'preview',
        type: state.tool,
        points: state.drawingPreview,
        value: '',
      }
    : null;
  return (
    <View
      style={styles.canvas}
      onLayout={event => setContainer(event.nativeEvent.layout)}
    >
      <GestureDetector gesture={gestures}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          {state.preview && (
            <Image
              source={{ uri: state.preview.uri }}
              draggable={false}
              cachePolicy="memory"
              contentFit="fill"
              style={
                size
                  ? {
                      position: 'absolute',
                      left: origin.x,
                      top: origin.y,
                      width: bottom.x - origin.x,
                      height: bottom.y - origin.y,
                    }
                  : StyleSheet.absoluteFill
              }
              onLoad={event => {
                const loaded = {
                  width: event.source.width,
                  height: event.source.height,
                };
                setRasterSize(loaded);
                session.imageLoaded(loaded, state.preview?.uri);
              }}
              onError={() => session.imageFailed(state.preview?.uri)}
              accessibilityLabel="影像编辑画布"
            />
          )}
          {state.history && state.imageSize && (
            <AnnotationOverlay
              snapshot={state.history.present}
              context={context}
              selection={state.selection}
              showLabels={showLabels}
              showKeypoints={
                showKeypoints ||
                state.tool === 'keypoint' ||
                state.tool === 'avt'
              }
              draftPoints={state.drawing?.points ?? []}
              preview={preview}
            />
          )}
        </View>
      </GestureDetector>
      {!state.imageReady && !state.error && (
        <View pointerEvents="none" style={styles.loading}>
          <ActivityIndicator color={c.blueLight} />
          <Text style={styles.caption}>正在加载影像…</Text>
        </View>
      )}
      <ScrollView
        style={[
          styles.shortcuts,
          { maxHeight: Math.max(44, container.height - 90) },
        ]}
        contentContainerStyle={{ gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {controls}
      </ScrollView>
      <View style={styles.zoom}>
        <EditorButton
          compact
          label="缩小影像"
          icon="remove"
          onPress={() => interaction.zoom(1 / 1.25)}
        />
        <Text style={styles.scale}>
          {Math.round(viewport.imageScale * 100)}%
        </Text>
        <EditorButton
          compact
          label="放大影像"
          icon="add"
          onPress={() => interaction.zoom(1.25)}
        />
      </View>
      {!!state.preview?.isThumbnail && (
        <View pointerEvents="none" style={styles.previewBadge}>
          <Text style={styles.caption}>服务端预览图</Text>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    minHeight: 150,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  caption: { color: c.muted, fontSize: 10 },
  shortcuts: { position: 'absolute', right: 12, top: 14, width: 44 },
  zoom: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827E8',
    borderWidth: 1,
    borderColor: c.border,
    padding: 4,
    borderRadius: 11,
    gap: 4,
  },
  scale: {
    color: c.text,
    fontSize: 11,
    minWidth: 40,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  previewBadge: {
    position: 'absolute',
    bottom: 28,
    right: 14,
    backgroundColor: '#111827CC',
    padding: 6,
    borderRadius: 5,
  },
});
