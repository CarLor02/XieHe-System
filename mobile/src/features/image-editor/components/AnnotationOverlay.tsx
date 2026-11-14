import { memo, useMemo } from 'react';
import { Circle, G, Line } from 'react-native-svg';
import type { SharedValue } from 'react-native-reanimated';
import {
  imageToScreen,
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
import { MeasurementDrawing } from './MeasurementDrawing';
import { SvgLayer } from './SvgLayer';
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
    const drawings = useMemo(
      () =>
        layer.measurements.map(measurement => ({
          measurement,
          primitives: measurementGeometry(measurement, projection, {
            calculationContext,
            renderPelvicSharedGeometry: measurement.id === pelvicOwnerId,
          }),
        })),
      [layer.measurements, projection, calculationContext, pelvicOwnerId]
    );
    const previewGeometry = preview
      ? measurementGeometry(preview, projection)
      : null;
    const bounds = geometryBounds(
      layer,
      projection,
      showKeypoints,
      preview,
      [
        ...drawings.map(drawing => drawing.primitives),
        ...(previewGeometry ? [previewGeometry] : []),
      ],
      context.imagePosition,
      layer.measurements.reduce(
        (max, item) =>
          Math.max(
            max,
            ...(pointLabels.get(item.id) ?? []).map(
              label => 8 + (label?.length ?? 0) * 16
            )
          ),
        32
      )
    );
    if (!bounds) return null;
    const project = (point: Point) => imageToScreen(point, projection);
    return (
      <SvgLayer context={projection} viewport={viewport} bounds={bounds}>
        {drawings.map(({ measurement, primitives }) => (
          <MeasurementDrawing
            key={measurement.id}
            measurement={measurement}
            context={projection}
            geometry={primitives}
            pointLabels={pointLabels.get(measurement.id)}
            selected={
              !!selection &&
              'measurementId' in selection &&
              selection.measurementId === measurement.id
            }
          />
        ))}
        {showKeypoints &&
          layer.keypoints.map(keypoint => {
            if (
              selection?.kind === 'keypoint' &&
              selection.keypointId === keypoint.id
            )
              return null;
            const point = project(keypoint.point);
            return (
              <Circle
                key={keypoint.id}
                cx={point.x}
                cy={point.y}
                r={4}
                fill="#111827"
                stroke="#34D399"
                strokeWidth={1.5}
              />
            );
          })}
        {layer.calibration.length === 2 &&
          (() => {
            const [a, b] = layer.calibration.map(project);
            return (
              <G>
                <Line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#FBBF24"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
                {[a, b].map((point, index) =>
                  selection?.kind === 'calibration' &&
                  selection.pointIndex === index ? null : (
                    <Circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={5}
                      stroke="#FBBF24"
                      fill="#111827"
                    />
                  )
                )}
              </G>
            );
          })()}
        {preview && previewGeometry && (
          <MeasurementDrawing
            geometry={previewGeometry}
            measurement={preview}
            context={projection}
            selected
          />
        )}
      </SvgLayer>
    );
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

/** 独立 SVG 根节点保证动态几何失效时不会重建静态标注位图。 */
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
  const layers = partitionAnnotations(snapshot, baseline, selection);
  return (
    <>
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
      {showLabels && (
        <AnnotationLabels
          readouts={readouts}
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
