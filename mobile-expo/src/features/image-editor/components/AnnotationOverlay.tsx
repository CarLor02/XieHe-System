import { memo } from 'react';
import { Circle, G, Line } from 'react-native-svg';
import type { SharedValue } from 'react-native-reanimated';
import {
  imageToScreen,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import type { EditorSelection } from '@/features/image-editor/application/dragAnnotation';
import type { EditorReadoutStore } from '@/features/image-editor/application/EditorReadoutStore';
import type { DragPreview, Viewport } from './interaction/canvasGestureModel';
import {
  geometryBounds,
  partitionAnnotations,
  sameLayer,
  type AnnotationLayer,
} from './annotationLayers';
import { MeasurementDrawing } from './MeasurementDrawing';
import { SvgLayer } from './SvgLayer';
import { NativeControlPoints } from './NativeControlPoints';
import { AnnotationLabels } from './AnnotationLabels';

interface LayerProps {
  layer: AnnotationLayer;
  context: TransformContext;
  viewport: SharedValue<Viewport>;
  selection: EditorSelection | null;
  showKeypoints: boolean;
  bounded?: boolean;
  preview?: MeasurementData | null;
}

const GeometryLayer = memo(
  function GeometryLayer({
    layer,
    context,
    viewport,
    selection,
    showKeypoints,
    bounded = false,
    preview = null,
  }: LayerProps) {
    const bounds = bounded
      ? geometryBounds(layer, context, showKeypoints, preview)
      : undefined;
    if (
      bounds === null ||
      (!layer.measurements.length &&
        (!showKeypoints || !layer.keypoints.length) &&
        !layer.calibration.length &&
        !preview)
    )
      return null;
    const project = (point: Point) => imageToScreen(point, context);
    return (
      <SvgLayer context={context} viewport={viewport} bounds={bounds}>
        {layer.measurements.map(measurement => (
          <MeasurementDrawing
            key={measurement.id}
            measurement={measurement}
            context={context}
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
        {preview && (
          <MeasurementDrawing
            measurement={preview}
            context={context}
            selected
          />
        )}
      </SvgLayer>
    );
  },
  (a, b) =>
    sameLayer(a.layer, b.layer) &&
    a.context === b.context &&
    a.viewport === b.viewport &&
    a.selection === b.selection &&
    a.showKeypoints === b.showKeypoints &&
    a.bounded === b.bounded &&
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
  const layers = partitionAnnotations(snapshot, baseline, selection);
  return (
    <>
      <GeometryLayer
        layer={layers.static}
        context={context}
        selection={selection}
        viewport={viewport}
        showKeypoints={showKeypoints}
      />
      <GeometryLayer
        layer={layers.dynamic}
        context={context}
        selection={selection}
        viewport={viewport}
        showKeypoints={showKeypoints}
        bounded
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
      />
    </>
  );
}
