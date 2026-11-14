import { memo, useMemo } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  getBilateralPelvicGeometryOwnerId,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import {
  getInteractivePointsCount,
  getMeasurementPointLabel,
} from '@xiehe/imaging-catalog/annotations';
import type { EditorSelection } from '@/features/image-editor/application/dragAnnotation';
import type { EditorReadoutStore } from '@/features/image-editor/application/EditorReadoutStore';
import type { DragPreview, Viewport } from './interaction/canvasGestureModel';
import {
  geometryBounds,
  partitionAnnotations,
  sameLayer,
  type AnnotationLayer,
} from './annotationLayers';
import { measurementGeometry } from './measurementGeometry';
import { GeometryScene, GeometryPicture } from './GeometryScene';
import { measurementDrawing, landmarkDrawings } from './geometryDrawing';
import { NativeControlPoints } from './NativeControlPoints';
import { AnnotationLabels } from './AnnotationLabels';

interface LayerProps {
  layer: AnnotationLayer;
  pelvicOwnerId: string | null;
  pointLabels: ReadonlyMap<string, (string | undefined)[]>;
  calculationContext: CalculationContext;
  context: TransformContext;
  viewport: SharedValue<Viewport>;
  selection: EditorSelection | null;
  showKeypoints: boolean;

  preview?: MeasurementData | null;
}

const GeometryLayer = memo(
  function GeometryLayer({
    layer,
    pelvicOwnerId,
    pointLabels,
    calculationContext,
    context,
    viewport,
    selection,
    showKeypoints,
    preview = null,
  }: LayerProps) {
    // 同倍率平移只移动裁剪窗口。图元、编号和测量规则都在零平移坐标系中复用。
    const { imageScale, imageNaturalSize, containerSize } = context;
    const projection = useMemo(
      () => ({
        imageScale,
        imageNaturalSize,
        containerSize,
        imagePosition: { x: 0, y: 0 },
      }),
      [imageScale, imageNaturalSize, containerSize]
    );
    const drawings = useMemo(() => {
      const items = layer.measurements.map(measurement =>
        measurementDrawing(
          measurement,
          measurementGeometry(measurement, projection, {
            calculationContext,
            renderPelvicSharedGeometry: measurement.id === pelvicOwnerId,
          }),
          projection,
          !!selection &&
            'measurementId' in selection &&
            selection.measurementId === measurement.id,
          pointLabels.get(measurement.id)
        )
      );
      items.push(
        ...landmarkDrawings(layer, projection, selection, showKeypoints)
      );
      if (preview)
        items.push(
          measurementDrawing(
            preview,
            measurementGeometry(preview, projection),
            projection,
            true
          )
        );
      return items;
    }, [
      layer,
      projection,
      calculationContext,
      pelvicOwnerId,
      selection,
      pointLabels,
      showKeypoints,
      preview,
    ]);
    const bounds = geometryBounds(
      layer,
      projection,
      showKeypoints,
      preview,
      drawings.map(d => d.primitives),
      context.imagePosition,
      drawings.reduce(
        (max, drawing) =>
          Math.max(
            max,
            ...(drawing.ordinals ?? []).map(({ text }) => 8 + text.length * 16)
          ),
        32
      )
    );
    return bounds ? (
      <GeometryPicture
        drawings={drawings}
        bounds={bounds}
        context={projection}
        viewport={viewport}
      />
    ) : null;
  },
  (a, b) =>
    sameLayer(a.layer, b.layer) &&
    a.context === b.context &&
    a.pointLabels === b.pointLabels &&
    a.pelvicOwnerId === b.pelvicOwnerId &&
    a.calculationContext.standardDistance ===
      b.calculationContext.standardDistance &&
    a.calculationContext.standardDistancePoints ===
      b.calculationContext.standardDistancePoints &&
    a.viewport === b.viewport &&
    a.selection === b.selection &&
    a.showKeypoints === b.showKeypoints &&
    a.preview === b.preview
);

/** 静态、动态两份图元独立缓存，使用同一视口。 */
export function AnnotationOverlay({
  snapshot,
  baseline,
  context,
  selection,
  showLabels,
  showKeypoints,
  draftPoints,
  preview,
  viewport,
  dragPreview,
  readouts,
}: {
  snapshot: AnnotationEditorSnapshot;
  baseline: AnnotationEditorSnapshot | null;
  context: TransformContext;
  selection: EditorSelection | null;
  showLabels: boolean;
  showKeypoints: boolean;
  draftPoints: Point[];
  preview: MeasurementData | null;
  viewport: SharedValue<Viewport>;
  dragPreview: SharedValue<DragPreview>;
  readouts: EditorReadoutStore;
}) {
  const pelvicOwnerId = getBilateralPelvicGeometryOwnerId(
    snapshot.measurements,
    () => false
  );
  const calculationContext = useMemo<CalculationContext>(
    () => ({
      standardDistance: snapshot.standardDistance,
      standardDistancePoints: snapshot.standardDistancePoints,
      imageNaturalSize: context.imageNaturalSize,
    }),
    [
      snapshot.standardDistance,
      snapshot.standardDistancePoints,
      context.imageNaturalSize,
    ]
  );
  // 拖动只改变坐标。共享点标签的顺序和归属取自同一份基线，避免每帧重扫列表。
  const definitions = (baseline ?? snapshot).measurements;
  const pointLabels = useMemo(
    () =>
      new Map(
        definitions.map((item, i) => [
          item.id,
          item.points
            .slice(
              0,
              getInteractivePointsCount(item.type) ?? item.points.length
            )
            .map((_, index) =>
              getMeasurementPointLabel(item, index, definitions, i)
            ),
        ])
      ),
    [definitions]
  );
  const layers = useMemo(
    () => partitionAnnotations(snapshot, baseline, selection),
    [snapshot, baseline, selection]
  );
  return (
    <>
      <GeometryScene context={context} viewport={viewport}>
        <GeometryLayer
          layer={layers.static}
          pelvicOwnerId={pelvicOwnerId}
          pointLabels={pointLabels}
          calculationContext={calculationContext}
          context={context}
          selection={selection}
          viewport={viewport}
          showKeypoints={showKeypoints}
        />
        <GeometryLayer
          layer={layers.dynamic}
          pelvicOwnerId={pelvicOwnerId}
          pointLabels={pointLabels}
          calculationContext={calculationContext}
          context={context}
          selection={selection}
          viewport={viewport}
          showKeypoints={showKeypoints}
          preview={preview}
        />
      </GeometryScene>
      {showLabels && (
        <AnnotationLabels
          readouts={readouts}
          baseline={baseline}
          context={context}
          viewport={viewport}
          selection={selection}
          showKeypoints={showKeypoints}
        />
      )}
      <NativeControlPoints
        snapshot={snapshot}
        context={context}
        viewport={viewport}
        preview={dragPreview}
        selection={selection}
        showKeypoints={showKeypoints}
        draftPoints={draftPoints}
        drawingPreview={preview}
        pointLabels={pointLabels}
      />
    </>
  );
}
