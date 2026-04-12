import { Point } from '../../../types';

interface ImageLayerProps {
  imageUrl: string;
  examType?: string;
  imagePosition: Point;
  imageScale: number;
  brightness: number;
  contrast: number;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onDragStart?: React.DragEventHandler<HTMLImageElement>;
}

export default function ImageLayer({
  imageUrl,
  examType,
  imagePosition,
  imageScale,
  brightness,
  contrast,
  onLoad,
  onDragStart,
}: ImageLayerProps) {
  return (
    <img
      src={imageUrl}
      alt={examType ?? '影像'}
      className="max-w-full max-h-full object-contain pointer-events-none select-none"
      onLoad={onLoad}
      onDragStart={onDragStart}
      style={{
        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
        transformOrigin: 'center center',
        filter: `brightness(${1 + brightness / 100}) contrast(${1 + contrast / 100})`,
      }}
      draggable={false}
    />
  );
}
