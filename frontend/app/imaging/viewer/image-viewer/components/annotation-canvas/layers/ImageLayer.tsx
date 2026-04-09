import { Point } from '../../../types';

interface ImageLayerProps {
  imageUrl: string;
  examType?: string;
  imagePosition: Point;
  imageScale: number;
  brightness: number;
  contrast: number;
}

export default function ImageLayer({
  imageUrl,
  examType,
  imagePosition,
  imageScale,
  brightness,
  contrast,
}: ImageLayerProps) {
  return (
    <img
      src={imageUrl}
      alt={examType ?? '影像'}
      className="max-w-full max-h-full object-contain pointer-events-none select-none"
      style={{
        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
        filter: `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`,
      }}
      draggable={false}
    />
  );
}

