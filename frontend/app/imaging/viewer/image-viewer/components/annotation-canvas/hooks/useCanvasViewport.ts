import { RefObject, useCallback, useEffect, useState } from 'react';
import { AdjustMode, Point } from '../../../types';
import { authenticatedBlobFetch } from '@/lib/api';

interface UseCanvasViewportOptions {
  imageId: string;
  centerOnPoint: Point | null;
  containerRef: RefObject<HTMLDivElement | null>;
  selectedTool: string;
  isSettingStandardDistance: boolean;
  onCenterConsumed: () => void;
  onImageSizeChange: (size: { width: number; height: number }) => void;
  onResetView: () => void;
}

/**
 * 图片视口、亮度、对比度、图片加载与居中逻辑。
 */
export function useCanvasViewport({
  imageId,
  centerOnPoint,
  containerRef,
  selectedTool,
  isSettingStandardDistance,
  onCenterConsumed,
  onImageSizeChange,
  onResetView,
}: UseCanvasViewportOptions) {
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

  useEffect(() => {
    if (!centerOnPoint || !imageNaturalSize) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const containerAspect = rect.width / rect.height;
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;

    let displayWidth: number;
    let displayHeight: number;
    if (containerAspect > imageAspect) {
      displayHeight = rect.height;
      displayWidth = displayHeight * imageAspect;
    } else {
      displayWidth = rect.width;
      displayHeight = displayWidth / imageAspect;
    }

    const scaleX = displayWidth / imageNaturalSize.width;
    const scaleY = displayHeight / imageNaturalSize.height;
    const imageCenterX = imageNaturalSize.width / 2;
    const imageCenterY = imageNaturalSize.height / 2;

    setImagePosition({
      x: -(centerOnPoint.x - imageCenterX) * scaleX * imageScale,
      y: -(centerOnPoint.y - imageCenterY) * scaleY * imageScale,
    });
    onCenterConsumed();
  }, [
    centerOnPoint,
    containerRef,
    imageNaturalSize,
    imageScale,
    onCenterConsumed,
  ]);

  useEffect(() => {
    let currentImageUrl: string | null = null;

    const fetchImage = async () => {
      try {
        setImageLoading(true);
        const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const imageBlob = await authenticatedBlobFetch(
          `${apiUrl}/api/v1/image-files/${numericId}/download`
        );
        const imageObjectUrl = URL.createObjectURL(imageBlob);
        currentImageUrl = imageObjectUrl;
        setImageUrl(imageObjectUrl);
      } catch (error) {
        console.error('获取图像失败:', error);
        setImageUrl(null);
      } finally {
        setImageLoading(false);
      }
    };

    fetchImage();

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (currentImageUrl) {
        URL.revokeObjectURL(currentImageUrl);
      }
    };
  }, [imageId]);

  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const image = event.target as HTMLImageElement;
      const size = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      setImageNaturalSize(size);
      onImageSizeChange(size);
      console.log('图像加载完成，原始尺寸:', {
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        displayWidth: image.width,
        displayHeight: image.height,
      });
    },
    [onImageSizeChange]
  );

  const zoomByFactor = useCallback((factor: number) => {
    setImageScale(previous => Math.max(0.1, Math.min(5, previous * factor)));
  }, []);

  const resetView = useCallback(() => {
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
    onResetView();
  }, [onResetView]);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!isHovering) return;
      event.preventDefault();
      event.stopPropagation();
      zoomByFactor(event.deltaY > 0 ? 0.9 : 1.1);
    },
    [isHovering, zoomByFactor]
  );

  const handleDoubleClick = useCallback(() => {
    resetView();
  }, [resetView]);

  const getCursorStyle = useCallback(() => {
    if (isSettingStandardDistance) return 'cursor-crosshair';
    if (selectedTool === 'hand') return 'cursor-grab active:cursor-grabbing';
    return 'cursor-crosshair';
  }, [isSettingStandardDistance, selectedTool]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelEvent = (event: Event) => {
      const wheelEvent = event as WheelEvent;
      wheelEvent.preventDefault();
      wheelEvent.stopPropagation();
      zoomByFactor(wheelEvent.deltaY > 0 ? 0.95 : 1.05);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        resetView();
      }
      if (event.key === '1') {
        event.preventDefault();
        setImageScale(1);
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomByFactor(1.2);
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomByFactor(0.8);
      }
    };

    container.addEventListener('wheel', handleWheelEvent as EventListener, {
      passive: false,
    });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleWheelEvent as EventListener);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, resetView, zoomByFactor]);

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
    imageLoading,
    imageNaturalSize,
    handleImageLoad,
    handleWheel,
    handleDoubleClick,
    resetView,
    getCursorStyle,
    zoomIn: () => zoomByFactor(1.2),
    zoomOut: () => zoomByFactor(0.8),
    increaseContrast: () =>
      setContrast(previous => Math.min(100, previous + 5)),
    decreaseContrast: () =>
      setContrast(previous => Math.max(-100, previous - 5)),
    increaseBrightness: () =>
      setBrightness(previous => Math.min(100, previous + 5)),
    decreaseBrightness: () =>
      setBrightness(previous => Math.max(-100, previous - 5)),
  };
}
