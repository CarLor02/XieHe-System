import {
  serializeTabularRows,
  type ExportContentType,
  type TabularExportFormat,
  type TabularRow,
} from '@xiehe/imaging-core/exports';

/** 文本序列化规则在 core；Web adapter 只创建浏览器下载 Blob。 */
export function createTabularBlob(
  rows: readonly TabularRow[],
  format: TabularExportFormat,
  kind: Extract<
    ExportContentType,
    'measurement-parameters' | 'annotation-points'
  >
): Blob {
  const result = serializeTabularRows(rows, format, kind);
  return new Blob(
    result.prependBom ? ['\uFEFF', result.content] : [result.content],
    { type: result.mimeType }
  );
}
