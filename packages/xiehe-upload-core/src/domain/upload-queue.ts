export type UploadQueueStatus = 'pending' | 'uploading' | 'completed' | 'error';

export interface UploadQueueEntry {
  status: UploadQueueStatus;
}

export interface UploadQueueSummary {
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  allCompleted: boolean;
}

export function summarizeUploadQueue(
  entries: readonly UploadQueueEntry[]
): UploadQueueSummary {
  const completedCount = entries.filter(
    entry => entry.status === 'completed'
  ).length;
  const failedCount = entries.filter(entry => entry.status === 'error').length;
  return {
    totalCount: entries.length,
    completedCount,
    pendingCount: entries.length - completedCount - failedCount,
    failedCount,
    allCompleted: entries.length > 0 && completedCount === entries.length,
  };
}
