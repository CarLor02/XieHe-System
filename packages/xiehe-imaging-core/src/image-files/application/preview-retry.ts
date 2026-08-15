export type PreviewRenderFailureAction = 'refresh-access-url' | 'fallback';

export interface PreviewRenderFailureDecision {
  failureCount: number;
  action: PreviewRenderFailureAction;
}

/** 图片元素加载失败时只刷新一次预签名 URL，之后稳定降级为占位图。 */
export function planPreviewRenderFailure(
  currentFailureCount: number,
  maxAccessUrlRefreshes = 1
): PreviewRenderFailureDecision {
  const failureCount = currentFailureCount + 1;
  return {
    failureCount,
    action:
      failureCount <= maxAccessUrlRefreshes ? 'refresh-access-url' : 'fallback',
  };
}

export function shouldRetryPreviewBatchRequest(
  completedAttempt: number,
  maxAttempts = 3
): boolean {
  return completedAttempt < Math.max(1, maxAttempts);
}

export const THUMBNAIL_PENDING_RETRY_DELAYS_MS = [
  1_000, 2_000, 4_000, 8_000, 16_000,
] as const;

/** 返回下一次 pending 轮询延迟；耗尽后由界面稳定降级为占位图。 */
export function getThumbnailPendingRetryDelay(
  completedRetries: number
): number | null {
  return THUMBNAIL_PENDING_RETRY_DELAYS_MS[completedRetries] ?? null;
}
