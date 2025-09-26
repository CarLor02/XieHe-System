'use client';

/**
 * 医学影像查看器组件
 *
 * 支持DICOM影像查看、缩放、平移、窗宽窗位调整
 *
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ImageViewerProps {
  imageUrl: string;
  imageId?: string;
  isDicom?: boolean;
  metadata?: DICOMMetadata;
  onImageLoad?: () => void;
  onError?: (error: string) => void;
  onStateChange?: (state: ViewerState) => void;
  className?: string;
}

interface DICOMMetadata {
  patientName?: string;
  studyDate?: string;
  modality?: string;
  windowCenter?: number;
  windowWidth?: number;
  rows?: number;
  columns?: number;
}

interface ViewerState {
  scale: number;
  offsetX: number;
  offsetY: number;
  windowCenter: number;
  windowWidth: number;
  brightness: number;
  contrast: number;
  rotation: number;
  isLoading: boolean;
  error: string | null;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  imageId,
  isDicom = false,
  metadata,
  onImageLoad,
  onError,
  onStateChange,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<ViewerState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    windowCenter: metadata?.windowCenter || 128,
    windowWidth: metadata?.windowWidth || 256,
    brightness: 0,
    contrast: 0,
    rotation: 0,
    isLoading: true,
    error: null,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isWindowLeveling, setIsWindowLeveling] = useState(false);

  // 加载图像
  useEffect(() => {
    if (!imageUrl) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (imageRef.current) {
        imageRef.current = img;
        drawImage();
        setState(prev => ({ ...prev, isLoading: false }));
        onImageLoad?.();
      }
    };

    img.onerror = () => {
      const errorMsg = '图像加载失败';
      setState(prev => ({ ...prev, error: errorMsg, isLoading: false }));
      onError?.(errorMsg);
    };

    img.src = imageUrl;
    imageRef.current = img;
  }, [imageUrl]);

  // 通知状态变化
  const notifyStateChange = useCallback(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // 监听状态变化
  useEffect(() => {
    notifyStateChange();
  }, [state, notifyStateChange]);

  // 外部控制接口
  const setScale = useCallback((newScale: number) => {
    setState(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(10, newScale)),
    }));
  }, []);

  const setPan = useCallback((offsetX: number, offsetY: number) => {
    setState(prev => ({ ...prev, offsetX, offsetY }));
  }, []);

  const setWindowLevel = useCallback(
    (windowCenter: number, windowWidth: number) => {
      setState(prev => ({ ...prev, windowCenter, windowWidth }));
    },
    []
  );

  const setRotation = useCallback((rotation: number) => {
    setState(prev => ({ ...prev, rotation: rotation % 360 }));
  }, []);

  // 暴露控制接口给父组件
  React.useImperativeHandle(
    React.forwardRef(() => null),
    () => ({
      setScale,
      setPan,
      setWindowLevel,
      setRotation,
      getState: () => state,
      resetView: () => {
        setState(prev => ({
          ...prev,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
        }));
      },
    }),
    [setScale, setPan, setWindowLevel, setRotation, state]
  );

  // 绘制图像
  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 保存上下文状态
    ctx.save();

    // 应用变换
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.translate(centerX + state.offsetX, centerY + state.offsetY);
    ctx.scale(state.scale, state.scale);
    ctx.rotate((state.rotation * Math.PI) / 180);

    // 计算图像绘制位置
    const imgWidth = img.width;
    const imgHeight = img.height;
    const drawX = -imgWidth / 2;
    const drawY = -imgHeight / 2;

    // 绘制图像
    ctx.drawImage(img, drawX, drawY, imgWidth, imgHeight);

    // 应用图像调整（亮度、对比度）
    if (state.brightness !== 0 || state.contrast !== 0 || isDicom) {
      const imageData = ctx.getImageData(drawX, drawY, imgWidth, imgHeight);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // 应用亮度
        data[i] = Math.max(0, Math.min(255, data[i] + state.brightness)); // R
        data[i + 1] = Math.max(
          0,
          Math.min(255, data[i + 1] + state.brightness)
        ); // G
        data[i + 2] = Math.max(
          0,
          Math.min(255, data[i + 2] + state.brightness)
        ); // B

        // 应用对比度
        const factor =
          (259 * (state.contrast + 255)) / (255 * (259 - state.contrast));
        data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.max(
          0,
          Math.min(255, factor * (data[i + 1] - 128) + 128)
        );
        data[i + 2] = Math.max(
          0,
          Math.min(255, factor * (data[i + 2] - 128) + 128)
        );

        // DICOM窗宽窗位调整
        if (isDicom) {
          const windowMin = state.windowCenter - state.windowWidth / 2;
          const windowMax = state.windowCenter + state.windowWidth / 2;

          for (let j = 0; j < 3; j++) {
            const pixel = data[i + j];
            if (pixel <= windowMin) {
              data[i + j] = 0;
            } else if (pixel >= windowMax) {
              data[i + j] = 255;
            } else {
              data[i + j] = ((pixel - windowMin) / state.windowWidth) * 255;
            }
          }
        }
      }

      ctx.putImageData(imageData, drawX, drawY);
    }

    // 恢复上下文状态
    ctx.restore();
  }, [state, isDicom]);

  // 重绘图像
  useEffect(() => {
    drawImage();
  }, [drawImage]);

  // 调整画布大小
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      drawImage();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawImage]);

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });

    // 右键开始窗宽窗位调整
    if (e.button === 2 && isDicom) {
      setIsWindowLeveling(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    if (isWindowLeveling && isDicom) {
      // 窗宽窗位调整
      setState(prev => ({
        ...prev,
        windowCenter: Math.max(0, Math.min(255, prev.windowCenter + deltaX)),
        windowWidth: Math.max(1, Math.min(512, prev.windowWidth + deltaY)),
      }));
    } else {
      // 图像平移
      setState(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX,
        offsetY: prev.offsetY + deltaY,
      }));
    }

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsWindowLeveling(false);
  };

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(10, state.scale * scaleFactor));

    setState(prev => ({ ...prev, scale: newScale }));
  };

  // 工具栏操作
  const zoomIn = () =>
    setState(prev => ({ ...prev, scale: Math.min(10, prev.scale * 1.2) }));
  const zoomOut = () =>
    setState(prev => ({ ...prev, scale: Math.max(0.1, prev.scale / 1.2) }));
  const resetZoom = () =>
    setState(prev => ({ ...prev, scale: 1, offsetX: 0, offsetY: 0 }));
  const rotateLeft = () =>
    setState(prev => ({ ...prev, rotation: prev.rotation - 90 }));
  const rotateRight = () =>
    setState(prev => ({ ...prev, rotation: prev.rotation + 90 }));

  const adjustBrightness = (delta: number) => {
    setState(prev => ({
      ...prev,
      brightness: Math.max(-100, Math.min(100, prev.brightness + delta)),
    }));
  };

  const adjustContrast = (delta: number) => {
    setState(prev => ({
      ...prev,
      contrast: Math.max(-100, Math.min(100, prev.contrast + delta)),
    }));
  };

  const resetAdjustments = () => {
    setState(prev => ({
      ...prev,
      brightness: 0,
      contrast: 0,
      windowCenter: metadata?.windowCenter || 128,
      windowWidth: metadata?.windowWidth || 256,
    }));
  };

  if (state.error) {
    return (
      <div className={`image-viewer-error ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl text-red-500 mb-4">⚠️</div>
            <p className="text-red-600">{state.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`image-viewer ${className}`}>
      {/* 工具栏 */}
      <div className="image-viewer-toolbar bg-gray-800 text-white p-2 flex items-center space-x-2 text-sm">
        {/* 缩放控制 */}
        <div className="flex items-center space-x-1">
          <button
            onClick={zoomOut}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            🔍-
          </button>
          <span className="px-2">{Math.round(state.scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            🔍+
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            重置
          </button>
        </div>

        <div className="border-l border-gray-600 h-6"></div>

        {/* 旋转控制 */}
        <div className="flex items-center space-x-1">
          <button
            onClick={rotateLeft}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            ↺
          </button>
          <button
            onClick={rotateRight}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            ↻
          </button>
        </div>

        <div className="border-l border-gray-600 h-6"></div>

        {/* 亮度对比度控制 */}
        <div className="flex items-center space-x-1">
          <span>亮度:</span>
          <button
            onClick={() => adjustBrightness(-10)}
            className="px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            -
          </button>
          <span className="w-8 text-center">{state.brightness}</span>
          <button
            onClick={() => adjustBrightness(10)}
            className="px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            +
          </button>
        </div>

        <div className="flex items-center space-x-1">
          <span>对比度:</span>
          <button
            onClick={() => adjustContrast(-10)}
            className="px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            -
          </button>
          <span className="w-8 text-center">{state.contrast}</span>
          <button
            onClick={() => adjustContrast(10)}
            className="px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            +
          </button>
        </div>

        {/* DICOM窗宽窗位控制 */}
        {isDicom && (
          <>
            <div className="border-l border-gray-600 h-6"></div>
            <div className="flex items-center space-x-1">
              <span>窗位: {Math.round(state.windowCenter)}</span>
              <span>窗宽: {Math.round(state.windowWidth)}</span>
            </div>
          </>
        )}

        <div className="border-l border-gray-600 h-6"></div>

        <button
          onClick={resetAdjustments}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          重置调整
        </button>

        {/* 图像信息 */}
        {metadata && (
          <div className="ml-auto flex items-center space-x-4 text-xs">
            {metadata.patientName && <span>患者: {metadata.patientName}</span>}
            {metadata.studyDate && <span>日期: {metadata.studyDate}</span>}
            {metadata.modality && <span>模态: {metadata.modality}</span>}
          </div>
        )}
      </div>

      {/* 图像显示区域 */}
      <div
        ref={containerRef}
        className="image-viewer-container flex-1 relative overflow-hidden bg-black"
        onContextMenu={e => e.preventDefault()}
      >
        {state.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white">加载中...</div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* 操作提示 */}
        <div className="absolute bottom-4 left-4 text-white text-xs bg-black bg-opacity-50 p-2 rounded">
          <div>左键拖拽: 平移图像</div>
          <div>滚轮: 缩放图像</div>
          {isDicom && <div>右键拖拽: 调整窗宽窗位</div>}
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
