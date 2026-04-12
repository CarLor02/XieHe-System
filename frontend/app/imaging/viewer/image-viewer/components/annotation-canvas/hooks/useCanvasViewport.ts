import { useState } from 'react';
import { AdjustMode, Point } from '../../../types';

/**
 * 图片视口、亮度、对比度等局部状态。
 */
export function useCanvasViewport() {
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [adjustMode, setAdjustMode] = useState<AdjustMode>('none');
  const [dragStartPos, setDragStartPos] = useState<Point>({ x: 0, y: 0 });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageNaturalSize, setImageNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  return {
    imagePosition,
    setImagePosition,
    imageScale,
    setImageScale,
    brightness,
    setBrightness,
    contrast,
    setContrast,
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    isHovering,
    setIsHovering,
    adjustMode,
    setAdjustMode,
    dragStartPos,
    setDragStartPos,
    imageUrl,
    setImageUrl,
    imageLoading,
    setImageLoading,
    imageNaturalSize,
    setImageNaturalSize,
  };
}
