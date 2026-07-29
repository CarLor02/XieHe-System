'use client';

import { getInheritedPoints } from '@/app/imaging/features/image-viewer/features/measurements/application/usecases/annotationInheritanceUseCase';
import ImageLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/layers/ImageLayer';
import MeasurementLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/layers/MeasurementLayer';
import OverlayLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/layers/OverlayLayer';
import PreviewLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/layers/PreviewLayer';
import SelectionOverlayLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/layers/SelectionOverlayLayer';
import VertebraeLayer from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/layers/VertebraeLayer';
import CanvasControlsPanel from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/panels/CanvasControlsPanel';
import CanvasHintPanel from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/panels/CanvasHintPanel';
import MeasurementResultsPanel from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/panels/MeasurementResultsPanel';
import type { AnnotationCanvasProps } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/annotation-canvas-props';
import {
  type AnnotationCanvasController,
  getAnnotationCanvasCursorClass,
  getDetectionSelectionKeypointIds,
  useAnnotationCanvasController,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/hooks/useAnnotationCanvasController';

export { getAnnotationCanvasCursorClass, getDetectionSelectionKeypointIds };
export type { AnnotationCanvasProps };

function AnnotationCanvasView({
  container,
  interactionSurface,
  resultsPanel,
  controlsPanel,
  image,
  vertebrae,
  measurementLayer,
  previewLayer,
  selectionLayer,
  hintPanel,
  overlayLayer,
}: AnnotationCanvasController) {
  return (
    <div
      {...container}
      data-image-canvas
      onDragStart={event => event.preventDefault()}
      onDrag={event => event.preventDefault()}
      onDragEnd={event => event.preventDefault()}
    >
      <MeasurementResultsPanel {...resultsPanel} />
      <CanvasControlsPanel {...controlsPanel} />

      <div
        {...interactionSurface}
        data-canvas-interaction-surface
        onDragStart={event => event.preventDefault()}
        onDrag={event => event.preventDefault()}
        onDragEnd={event => event.preventDefault()}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {image.imageLoading ? (
            <div className="flex items-center justify-center text-white">
              <i className="ri-loader-line mb-3 flex h-8 w-8 animate-spin items-center justify-center text-2xl" />
              <p className="ml-2 text-sm">加载图像中...</p>
            </div>
          ) : image.imageUrl ? (
            <ImageLayer
              imageUrl={image.imageUrl}
              examType={image.examType}
              imagePosition={image.imagePosition}
              imageScale={image.imageScale}
              brightness={image.brightness}
              contrast={image.contrast}
              onDragStart={event => event.preventDefault()}
              onLoad={image.onLoad}
            />
          ) : (
            <div className="flex items-center justify-center text-white">
              <p className="text-sm">图像加载失败</p>
            </div>
          )}
        </div>

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ zIndex: 10 }}
        >
          <defs>
            <marker
              id="arrowhead-normal"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#f59e0b" />
            </marker>
            <marker
              id="arrowhead-hovered"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#fbbf24" />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>

          {vertebrae.visible && <VertebraeLayer {...vertebrae} />}
          <MeasurementLayer {...measurementLayer} />
          <PreviewLayer
            {...previewLayer}
            getInheritedPoints={getInheritedPoints}
          />
          <SelectionOverlayLayer {...selectionLayer} />
        </svg>

        <CanvasHintPanel
          {...hintPanel}
          getInheritedPoints={getInheritedPoints}
        />
      </div>

      <OverlayLayer {...overlayLayer} />
    </div>
  );
}

export default function AnnotationCanvas(props: AnnotationCanvasProps) {
  const controller = useAnnotationCanvasController(props);
  return <AnnotationCanvasView {...controller} />;
}
