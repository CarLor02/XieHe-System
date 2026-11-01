import type { ImageFile, ImageFileStatus } from '@xiehe/api-contracts';

export function imageStatusLabel(status: ImageFileStatus) {
  return (
    {
      UPLOADING: '上传中',
      UPLOADED: '已上传',
      PROCESSING: '处理中',
      PROCESSED: '已完成',
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
  const trimmed = value?.trim();
  if (!trimmed) return '未记录';
  // 影像 API 的无时区时间按 UTC 存储；显式偏移必须保留，避免重复加 8 小时。
  const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const timestamp = trimmed.replace(' ', 'T');
  const date = new Date(hasTimeZone ? timestamp : `${timestamp}Z`);
  return Number.isNaN(date.getTime())
    ? trimmed
    : date.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      });
}

export function imageTeamLabel(
  image: Pick<ImageFile, 'team_ids' | 'team_names'>
) {
  const names = image.team_names?.map(name => name.trim()).filter(Boolean);
  return names?.length
    ? names.join('、')
    : image.team_ids?.length
      ? `已归属 ${image.team_ids.length} 个团队`
      : '仅自己可见';
}

export function truncateImageLabel(value: string, maxChars = 10): string {
  const chars = Array.from(value);
  return chars.length > maxChars
    ? `${chars.slice(0, maxChars).join('')}…`
    : value;
}
