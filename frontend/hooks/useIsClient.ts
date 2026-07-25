import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * 提供 SSR 安全的客户端挂载状态，避免通过 effect 同步设置 mounted 状态。
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
