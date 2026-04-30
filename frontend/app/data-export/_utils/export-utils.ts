import type { MeasurementData, Point } from '@/app/imaging/viewer/image-viewer/types';
import type { ImageFile } from '@/services/imageServices/imageFileService';

export type ExportContentType =
  | 'original-image'
  | 'annotated-image'
  | 'annotation-points'
  | 'measurement-parameters';

export type TabularExportFormat = 'csv' | 'json' | 'excel';
export type AnnotatedImageExportFormat = 'png' | 'jpeg';

type ExportFormat = TabularExportFormat | AnnotatedImageExportFormat | 'original';

export interface ExportFile {
  filename: string;
  blob: Blob;
}

export interface ParsedAnnotationData {
  measurements: MeasurementData[];
  imageWidth?: number;
  imageHeight?: number;
}

const TABULAR_EXPORT_EXTENSIONS: Record<TabularExportFormat, string> = {
  csv: 'csv',
  json: 'json',
  excel: 'xls',
};

const IMAGE_EXPORT_EXTENSIONS: Record<AnnotatedImageExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
};

const ZIP_UTF8_FLAG = 0x0800;

const MEASUREMENT_HEADERS = [
  '文件名',
  '影像ID',
  '患者ID',
  '检查类型',
  '上传日期',
  '标注ID',
  '参数名称',
  '参数值',
  '描述',
];

const ANNOTATION_POINT_HEADERS = [
  '文件名',
  '影像ID',
  '患者ID',
  '检查类型',
  '上传日期',
  '标注ID',
  '标注类型',
  '标注值',
  '点位序号',
  'X',
  'Y',
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

function getOriginalFilename(image: ImageFile): string {
  return sanitizeFilename(image.original_filename || `image_${image.id}`);
}

function getFilenameBase(image: ImageFile): string {
  const filename = getOriginalFilename(image);
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
}

function getFilenameExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.slice(dotIndex + 1).toLowerCase() : '';
}

function getExtensionFromMimeType(mimeType?: string): string {
  if (!mimeType) return '';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('tiff')) return 'tiff';
  if (mimeType.includes('dicom')) return 'dcm';
  return '';
}

function getOriginalExportFilename(image: ImageFile): string {
  const filename = getOriginalFilename(image);
  if (getFilenameExtension(filename)) {
    return filename;
  }

  const extension = getExtensionFromMimeType(image.mime_type);
  return extension ? `${filename}.${extension}` : filename;
}

export function buildExportFilename(
  image: ImageFile,
  exportContent: ExportContentType,
  format: ExportFormat
): string {
  if (exportContent === 'original-image') {
    return getOriginalExportFilename(image);
  }

  const base = getFilenameBase(image);
  if (exportContent === 'annotated-image') {
    return `${base}.${IMAGE_EXPORT_EXTENSIONS[format as AnnotatedImageExportFormat]}`;
  }

  return `${base}.${TABULAR_EXPORT_EXTENSIONS[format as TabularExportFormat]}`;
}

export function parseAnnotationData(image: ImageFile): ParsedAnnotationData | null {
  if (!image.annotation) {
    return null;
  }

  try {
    const parsed = JSON.parse(image.annotation);
    if (!parsed || !Array.isArray(parsed.measurements)) {
      return null;
    }

    return {
      measurements: parsed.measurements,
      imageWidth: Number(parsed.imageWidth) || undefined,
      imageHeight: Number(parsed.imageHeight) || undefined,
    };
  } catch (error) {
    console.warn('解析影像标注数据失败:', error);
    return null;
  }
}

export function getMeasurementsForImage(
  image: ImageFile,
  fallbackMeasurements: MeasurementData[] = []
): MeasurementData[] {
  const annotation = parseAnnotationData(image);
  return annotation?.measurements ?? fallbackMeasurements;
}

function formatDate(dateValue?: string): string {
  if (!dateValue) {
    return '';
  }

  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? dateValue : date.toLocaleDateString('zh-CN');
}

function normalizeCellValue(value: unknown): string | number {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return value;
  }
  return String(value);
}

export function buildMeasurementRows(
  image: ImageFile,
  measurements: MeasurementData[]
): Record<string, string | number>[] {
  return measurements.map(measurement => ({
    文件名: image.original_filename || '',
    影像ID: image.id,
    患者ID: image.patient_id || '',
    检查类型: image.description || '',
    上传日期: formatDate(image.created_at),
    标注ID: measurement.id || '',
    参数名称: measurement.type || '',
    参数值: measurement.value || '',
    描述: measurement.description || '',
  }));
}

export function buildAnnotationPointRows(
  image: ImageFile,
  measurements: MeasurementData[]
): Record<string, string | number>[] {
  return measurements.flatMap(measurement =>
    (measurement.points || []).map((point, index) => ({
      文件名: image.original_filename || '',
      影像ID: image.id,
      患者ID: image.patient_id || '',
      检查类型: image.description || '',
      上传日期: formatDate(image.created_at),
      标注ID: measurement.id || '',
      标注类型: measurement.type || '',
      标注值: measurement.value || '',
      点位序号: index + 1,
      X: point.x,
      Y: point.y,
    }))
  );
}

function escapeCsvCell(value: unknown): string {
  const text = String(normalizeCellValue(value));
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function createCsvContent(
  rows: Record<string, string | number>[],
  headers: string[]
): string {
  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => escapeCsvCell(row[header])).join(',')),
  ].join('\n');
}

function escapeHtmlCell(value: unknown): string {
  return String(normalizeCellValue(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createExcelHtmlContent(
  rows: Record<string, string | number>[],
  headers: string[]
): string {
  const headerCells = headers.map(header => `<th>${escapeHtmlCell(header)}</th>`).join('');
  const bodyRows = rows
    .map(row => `<tr>${headers.map(header => `<td>${escapeHtmlCell(row[header])}</td>`).join('')}</tr>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
}

export function createTabularBlob(
  rows: Record<string, string | number>[],
  format: TabularExportFormat,
  kind: 'measurement-parameters' | 'annotation-points'
): Blob {
  const headers =
    kind === 'measurement-parameters' ? MEASUREMENT_HEADERS : ANNOTATION_POINT_HEADERS;

  if (format === 'json') {
    return new Blob([JSON.stringify(rows, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
  }

  if (format === 'excel') {
    return new Blob(['\uFEFF', createExcelHtmlContent(rows, headers)], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    });
  }

  return new Blob(['\uFEFF', createCsvContent(rows, headers)], {
    type: 'text/csv;charset=utf-8',
  });
}

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

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosDate, dosTime };
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function createLocalHeader({
  filenameBytes,
  crc,
  size,
}: {
  filenameBytes: Uint8Array;
  crc: number;
  size: number;
}): Uint8Array {
  const header = new Uint8Array(30 + filenameBytes.length);
  const view = new DataView(header.buffer);
  const { dosDate, dosTime } = getDosDateTime();

  writeUint32(view, 0, 0x04034b50);
  writeUint16(view, 4, 20);
  writeUint16(view, 6, ZIP_UTF8_FLAG);
  writeUint16(view, 8, 0);
  writeUint16(view, 10, dosTime);
  writeUint16(view, 12, dosDate);
  writeUint32(view, 14, crc);
  writeUint32(view, 18, size);
  writeUint32(view, 22, size);
  writeUint16(view, 26, filenameBytes.length);
  writeUint16(view, 28, 0);
  header.set(filenameBytes, 30);

  return header;
}

function createCentralDirectoryHeader({
  filenameBytes,
  crc,
  size,
  localHeaderOffset,
}: {
  filenameBytes: Uint8Array;
  crc: number;
  size: number;
  localHeaderOffset: number;
}): Uint8Array {
  const header = new Uint8Array(46 + filenameBytes.length);
  const view = new DataView(header.buffer);
  const { dosDate, dosTime } = getDosDateTime();

  writeUint32(view, 0, 0x02014b50);
  writeUint16(view, 4, 20);
  writeUint16(view, 6, 20);
  writeUint16(view, 8, ZIP_UTF8_FLAG);
  writeUint16(view, 10, 0);
  writeUint16(view, 12, dosTime);
  writeUint16(view, 14, dosDate);
  writeUint32(view, 16, crc);
  writeUint32(view, 20, size);
  writeUint32(view, 24, size);
  writeUint16(view, 28, filenameBytes.length);
  writeUint16(view, 30, 0);
  writeUint16(view, 32, 0);
  writeUint16(view, 34, 0);
  writeUint16(view, 36, 0);
  writeUint32(view, 38, 0);
  writeUint32(view, 42, localHeaderOffset);
  header.set(filenameBytes, 46);

  return header;
}

function createEndOfCentralDirectory({
  fileCount,
  centralDirectorySize,
  centralDirectoryOffset,
}: {
  fileCount: number;
  centralDirectorySize: number;
  centralDirectoryOffset: number;
}): Uint8Array {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);

  writeUint32(view, 0, 0x06054b50);
  writeUint16(view, 4, 0);
  writeUint16(view, 6, 0);
  writeUint16(view, 8, fileCount);
  writeUint16(view, 10, fileCount);
  writeUint32(view, 12, centralDirectorySize);
  writeUint32(view, 16, centralDirectoryOffset);
  writeUint16(view, 20, 0);

  return header;
}

function makeUniqueFilename(filename: string, usedFilenames: Set<string>): string {
  const sanitized = sanitizeFilename(filename) || 'export';
  if (!usedFilenames.has(sanitized)) {
    usedFilenames.add(sanitized);
    return sanitized;
  }

  const dotIndex = sanitized.lastIndexOf('.');
  const base = dotIndex > 0 ? sanitized.slice(0, dotIndex) : sanitized;
  const extension = dotIndex > 0 ? sanitized.slice(dotIndex) : '';
  let index = 2;
  let next = `${base} (${index})${extension}`;
  while (usedFilenames.has(next)) {
    index += 1;
    next = `${base} (${index})${extension}`;
  }
  usedFilenames.add(next);
  return next;
}

export async function createZipBlob(files: ExportFile[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const usedFilenames = new Set<string>();
  const localParts: ArrayBuffer[] = [];
  const centralParts: ArrayBuffer[] = [];
  let offset = 0;
  let centralDirectorySize = 0;

  for (const file of files) {
    const filename = makeUniqueFilename(file.filename, usedFilenames);
    const filenameBytes = encoder.encode(filename);
    const contentBuffer = await file.blob.arrayBuffer();
    const content = new Uint8Array(contentBuffer);
    const crc = crc32(content);
    const localHeaderOffset = offset;
    const localHeader = createLocalHeader({
      filenameBytes,
      crc,
      size: content.length,
    });
    const centralHeader = createCentralDirectoryHeader({
      filenameBytes,
      crc,
      size: content.length,
      localHeaderOffset,
    });

    localParts.push(localHeader.buffer as ArrayBuffer, contentBuffer);
    centralParts.push(centralHeader.buffer as ArrayBuffer);
    offset += localHeader.length + content.length;
    centralDirectorySize += centralHeader.length;
  }

  const endHeader = createEndOfCentralDirectory({
    fileCount: files.length,
    centralDirectorySize,
    centralDirectoryOffset: offset,
  });

  return new Blob([...localParts, ...centralParts, endHeader.buffer as ArrayBuffer], {
    type: 'application/zip',
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename) || 'export';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadExportFiles(files: ExportFile[], zipFilename: string) {
  if (files.length === 0) {
    return;
  }

  if (files.length === 1) {
    downloadBlob(files[0].blob, files[0].filename);
    return;
  }

  const zipBlob = await createZipBlob(files);
  downloadBlob(zipBlob, zipFilename);
}
