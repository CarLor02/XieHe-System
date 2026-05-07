import type { MeasurementData } from '@/app/imaging/viewer/image-viewer/public';
import type { ImageFile } from '@/services/imageServices/imageFileService';

import type { ExportContentType, TabularExportFormat } from './export-types';

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
  kind: Extract<ExportContentType, 'measurement-parameters' | 'annotation-points'>
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
