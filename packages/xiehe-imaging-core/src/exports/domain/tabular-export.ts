import type { MeasurementData } from '../../shared/domain/contracts';
import type { KeypointAnnotation } from '../../keypoints/domain';
import type {
  ExportContentType,
  TabularExportFormat,
} from './export-filenames';

export type TabularRow = Record<string, string | number>;

export interface TabularExportImage {
  id: number;
  original_filename?: string | null;
  patient_id?: number | null;
  description?: string | null;
  created_at?: string | null;
}

export interface SerializedTabularContent {
  content: string;
  mimeType: string;
  prependBom: boolean;
}

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
  '检测点名称',
  '来源',
  '置信度',
  'X',
  'Y',
];

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('zh-CN');
}

function normalizeCellValue(value: unknown): string | number {
  if (value === null || value === undefined) return '';
  return typeof value === 'number' ? value : String(value);
}

export function buildMeasurementRows(
  image: TabularExportImage,
  measurements: readonly MeasurementData[]
): TabularRow[] {
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
  image: TabularExportImage,
  keypoints: readonly KeypointAnnotation[]
): TabularRow[] {
  return keypoints.map(keypoint => ({
    文件名: image.original_filename || '',
    影像ID: image.id,
    患者ID: image.patient_id || '',
    检查类型: image.description || '',
    上传日期: formatDate(image.created_at),
    检测点名称: keypoint.id,
    来源: keypoint.source,
    置信度: keypoint.confidence,
    X: keypoint.point.x,
    Y: keypoint.point.y,
  }));
}

function escapeCsvCell(value: unknown): string {
  const text = String(normalizeCellValue(value));
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function createCsvContent(rows: readonly TabularRow[], headers: string[]) {
  return [
    headers.join(','),
    ...rows.map(row =>
      headers.map(header => escapeCsvCell(row[header])).join(',')
    ),
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
  rows: readonly TabularRow[],
  headers: string[]
): string {
  const headerCells = headers
    .map(header => `<th>${escapeHtmlCell(header)}</th>`)
    .join('');
  const bodyRows = rows
    .map(
      row =>
        `<tr>${headers.map(header => `<td>${escapeHtmlCell(row[header])}</td>`).join('')}</tr>`
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
}

export function serializeTabularRows(
  rows: readonly TabularRow[],
  format: TabularExportFormat,
  kind: Extract<
    ExportContentType,
    'measurement-parameters' | 'annotation-points'
  >
): SerializedTabularContent {
  const headers =
    kind === 'measurement-parameters'
      ? MEASUREMENT_HEADERS
      : ANNOTATION_POINT_HEADERS;
  if (format === 'json') {
    return {
      content: JSON.stringify(rows, null, 2),
      mimeType: 'application/json;charset=utf-8',
      prependBom: false,
    };
  }
  if (format === 'excel') {
    return {
      content: createExcelHtmlContent(rows, headers),
      mimeType: 'application/vnd.ms-excel;charset=utf-8',
      prependBom: true,
    };
  }
  return {
    content: createCsvContent(rows, headers),
    mimeType: 'text/csv;charset=utf-8',
    prependBom: true,
  };
}
