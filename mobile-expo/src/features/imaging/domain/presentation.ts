import type { ImageFileStatus } from '@xiehe/api-contracts';

export function imageStatusLabel(status: ImageFileStatus) {
  return (
    {
      UPLOADING: '上传中',
      UPLOADED: '待处理',
      PROCESSING: '处理中',
      PROCESSED: '已处理',
      FAILED: '处理失败',
      ARCHIVED: '已归档',
      DELETED: '已删除',
    }[status] ?? status
  );
}
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export function formatDate(value?: string | null): string {
  if (!value) return '未记录';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
}
