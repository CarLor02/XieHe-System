import type { MeasurementData, Point } from '@/app/imaging/viewer/image-viewer/types';

import type { AnnotatedImageExportFormat } from '../domain';

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('影像文件无法作为图片加载'));
    };
    image.src = url;
  });
}

function scalePoint(
  point: Point,
  scaleX: number,
  scaleY: number
): Point {
  return {
    x: point.x * scaleX,
    y: point.y * scaleY,
  };
}

function drawArrowHead(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const size = Math.max(12, Math.min(28, ctx.canvas.width / 40));
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - size * Math.cos(angle - Math.PI / 6),
    end.y - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - size * Math.cos(angle + Math.PI / 6),
    end.y - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function drawMeasurementShape(
  ctx: CanvasRenderingContext2D,
  measurement: MeasurementData,
  points: Point[]
) {
  if (points.length === 0) return;

  const typeText = `${measurement.type || ''} ${measurement.originalType || ''}`.toLowerCase();
  const isCircle = typeText.includes('circle') || typeText.includes('圆');
  const isEllipse = typeText.includes('ellipse') || typeText.includes('椭圆');
  const isRectangle =
    typeText.includes('rectangle') ||
    typeText.includes('box') ||
    typeText.includes('矩形') ||
    typeText.includes('框');
  const isPolygon = typeText.includes('polygon') || typeText.includes('多边形');
  const isArrow = typeText.includes('arrow') || typeText.includes('箭头');

  ctx.beginPath();

  if (isCircle && points.length >= 2) {
    const radius = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
    ctx.arc(points[0].x, points[0].y, radius, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (isEllipse && points.length >= 2) {
    const radiusX = Math.abs(points[1].x - points[0].x);
    const radiusY = Math.abs(points[1].y - points[0].y);
    ctx.ellipse(points[0].x, points[0].y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (isRectangle && points.length >= 2) {
    const x = Math.min(points[0].x, points[1].x);
    const y = Math.min(points[0].y, points[1].y);
    const width = Math.abs(points[1].x - points[0].x);
    const height = Math.abs(points[1].y - points[0].y);
    ctx.strokeRect(x, y, width, height);
    return;
  }

  if (points.length === 1) {
    const size = Math.max(8, Math.min(18, ctx.canvas.width / 70));
    ctx.moveTo(points[0].x - size, points[0].y);
    ctx.lineTo(points[0].x + size, points[0].y);
    ctx.moveTo(points[0].x, points[0].y - size);
    ctx.lineTo(points[0].x, points[0].y + size);
    ctx.stroke();
    return;
  }

  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => {
    ctx.lineTo(point.x, point.y);
  });

  if (isPolygon && points.length >= 3) {
    ctx.closePath();
  }

  ctx.stroke();

  if (isArrow && points.length >= 2) {
    drawArrowHead(ctx, points[points.length - 2], points[points.length - 1]);
  }
}

function drawMeasurementLabel(
  ctx: CanvasRenderingContext2D,
  measurement: MeasurementData,
  points: Point[],
  color: string
) {
  const lastPoint = points[points.length - 1];
  if (!lastPoint) return;

  const label = measurement.value
    ? `${measurement.type}: ${measurement.value}`
    : measurement.type;
  if (!label) return;

  const fontSize = Math.max(14, Math.min(28, ctx.canvas.width / 55));
  ctx.font = `${fontSize}px sans-serif`;
  const paddingX = 8;
  const paddingY = 5;
  const textWidth = ctx.measureText(label).width;
  const x = Math.min(lastPoint.x + 10, ctx.canvas.width - textWidth - paddingX * 2);
  const y = Math.max(fontSize + paddingY, lastPoint.y - 10);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
  ctx.fillRect(
    x - paddingX,
    y - fontSize - paddingY,
    textWidth + paddingX * 2,
    fontSize + paddingY * 2
  );
  ctx.fillStyle = color;
  ctx.fillText(label, x, y);
}

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
  const image = await loadImageFromBlob(imageBlob);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建绘图上下文');
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const sourceWidth = annotationSize?.width || canvas.width;
  const sourceHeight = annotationSize?.height || canvas.height;
  const scaleX = canvas.width / sourceWidth;
  const scaleY = canvas.height / sourceHeight;
  const colors = ['#facc15', '#38bdf8', '#fb7185', '#34d399', '#a78bfa', '#f97316'];

  measurements.forEach((measurement, index) => {
    const color = colors[index % colors.length];
    const points = (measurement.points || []).map(point => scalePoint(point, scaleX, scaleY));

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, Math.min(6, canvas.width / 420));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawMeasurementShape(ctx, measurement, points);

    const pointRadius = Math.max(4, Math.min(10, canvas.width / 160));
    points.forEach((point, pointIndex) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = `${Math.max(12, Math.min(22, canvas.width / 70))}px sans-serif`;
      ctx.fillText(String(pointIndex + 1), point.x + pointRadius + 3, point.y - pointRadius - 3);
    });

    drawMeasurementLabel(ctx, measurement, points, color);
    ctx.restore();
  });

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
