import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MeasurementData } from '@/app/imaging/viewer/image-viewer/types';
import renderMeasurement from '@/app/imaging/viewer/image-viewer/components/annotation-canvas/renderers/renderMeasurement';
import type { AnnotatedImageExportFormat } from '../domain';

// ── 内部工具函数 ────────────────────────────────────────────────────────────

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('影像文件无法作为图片加载')); };
    image.src = url;
  });
}

/**
 * 将 SVG 字符串转换为图片
 */
function loadSVGAsImage(svgString: string, width: number, height: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.width = width;
    image.height = height;
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(url);
      console.error('SVG 加载失败:', error);
      reject(new Error('SVG 无法作为图片加载'));
    };
    image.src = url;
  });
}

/**
 * 使用实际的 React SVG 渲染器生成测量标注的 SVG
 * 这个方法重用了交互式查看器中的实际渲染逻辑，确保导出图像与查看器显示完全一致
 */
function renderMeasurementsToSVG(
  measurements: MeasurementData[],
  width: number,
  height: number
): string {
  // 创建一个空的选择和悬停状态（导出时不需要交互状态）
  const selectionState = {
    measurementId: null,
    pointIndex: null,
    type: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
  };
  const hoverState = {
    measurementId: null,
    keypointId: null,
    pointIndex: null,
    elementType: null,
  };
  const hiddenMeasurementIds = new Set<string>();
  const pointBindings = { groups: [], syncGroups: [] };

  // 计算合适的 imageScale 用于字体大小
  // 在查看器中，imageScale = 屏幕像素 / 图像像素
  // 对于导出，我们希望字体在高分辨率图像上仍然可读
  // 假设标准查看器宽度约 1000px，计算等效的 imageScale
  const REFERENCE_SCREEN_WIDTH = 1000;
  const effectiveImageScale = Math.max(0.5, Math.min(2.0, REFERENCE_SCREEN_WIDTH / width));

  // 渲染所有测量项 - 使用实际的 React 渲染器
  const measurementElements = measurements.map((measurement, index) => {
    return renderMeasurement({
      measurement,
      imageScale: effectiveImageScale, // 使用计算的有效缩放比例，确保字体大小适中
      imagePosition: { x: 0, y: 0 },
      imageNaturalSize: { width, height },
      selectionState,
      hoverState,
      hideAllLabels: false,
      hiddenMeasurementIds,
      pointBindings,
      selectedBindingGroupId: null,
      isManualBindingMode: false,
      manualBindingSelectedPoints: [],
      allMeasurements: measurements,
      measurementIndex: index,
    });
  });

  // 创建 SVG 定义（箭头标记等）
  // 这些定义与交互式查看器中的定义相同，确保箭头等形状正确显示
  const defs = React.createElement(
    'defs',
    null,
    React.createElement(
      'marker',
      {
        id: 'arrowhead-normal',
        markerWidth: '10',
        markerHeight: '10',
        refX: '9',
        refY: '3',
        orient: 'auto',
      },
      React.createElement('polygon', { points: '0 0, 10 3, 0 6', fill: '#f59e0b' })
    ),
    React.createElement(
      'marker',
      {
        id: 'arrowhead-hovered',
        markerWidth: '10',
        markerHeight: '10',
        refX: '9',
        refY: '3',
        orient: 'auto',
      },
      React.createElement('polygon', { points: '0 0, 10 3, 0 6', fill: '#fbbf24' })
    ),
    React.createElement(
      'marker',
      {
        id: 'arrowhead-selected',
        markerWidth: '10',
        markerHeight: '10',
        refX: '9',
        refY: '3',
        orient: 'auto',
      },
      React.createElement('polygon', { points: '0 0, 10 3, 0 6', fill: '#ef4444' })
    )
  );

  // 将 React 元素转换为 SVG 字符串
  // 使用 React.createElement 而不是 JSX 以确保在 .ts 文件中工作
  const svgElement = React.createElement(
    'svg',
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      xmlns: 'http://www.w3.org/2000/svg',
    },
    [defs, ...measurementElements]
  );

  return renderToStaticMarkup(svgElement);
}

/**
 * 创建带有标注的导出图像
 *
 * 该函数使用与交互式查看器相同的 React SVG 渲染逻辑来绘制测量标注，
 * 确保导出的图像与用户在查看器中看到的完全一致。
 *
 * 工作流程：
 * 1. 加载 DICOM 图像到 canvas
 * 2. 使用实际的 React 渲染器将测量标注渲染为 SVG
 * 3. 将 SVG 转换为图像
 * 4. 将 SVG 图像叠加到 DICOM 图像之上
 * 5. 导出最终的复合图像
 */
export async function createAnnotatedImageBlob({
  imageBlob,
  measurements,
  annotationSize,
  format,
}: {
  imageBlob: Blob;
  measurements: MeasurementData[];
  annotationSize?: { width?: number; height?: number };
  format: AnnotatedImageExportFormat;
}): Promise<Blob> {
  // 加载 DICOM 图像
  const image = await loadImageFromBlob(imageBlob);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建绘图上下文');
  }

  // 绘制基础图像
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  // 计算坐标缩放（如果标注是在不同分辨率下创建的）
  const sourceWidth = annotationSize?.width || canvas.width;
  const sourceHeight = annotationSize?.height || canvas.height;
  const scaleX = canvas.width / sourceWidth;
  const scaleY = canvas.height / sourceHeight;

  // 如果需要缩放，调整测量点坐标
  const scaledMeasurements: MeasurementData[] = measurements.map(measurement => ({
    ...measurement,
    points: (measurement.points || []).map(point => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    })),
  }));

  // 使用实际的 React SVG 渲染器生成标注 SVG
  // 这确保了导出的图像使用与交互式查看器相同的渲染逻辑和颜色
  const svgString = renderMeasurementsToSVG(
    scaledMeasurements,
    canvas.width,
    canvas.height
  );

  // 将 SVG 转换为图像并叠加到画布上
  try {
    const svgImage = await loadSVGAsImage(svgString, canvas.width, canvas.height);
    ctx.drawImage(svgImage, 0, 0);
  } catch (error) {
    console.error('SVG 渲染失败:', error);
    console.log('SVG 内容:', svgString.substring(0, 500)); // 输出前500字符用于调试
    throw error;
  }

  // 导出最终图像
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('绘图影像生成失败'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      format === 'jpeg' ? 0.92 : undefined
    );
  });
}
