import { Point } from '@/app/imaging/features/image-viewer/shared/types';

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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={examType ?? '影像'}
      className="w-full h-full object-contain pointer-events-none select-none"
      crossOrigin="anonymous"
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
