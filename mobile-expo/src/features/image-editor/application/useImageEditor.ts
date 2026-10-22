import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ImageEditorSession } from './ImageEditorSession';
import type { ImageEditorGateway } from './ports';

export function useImageEditor(imageId: number, gateway: ImageEditorGateway) {
  const session = useMemo(
    () => new ImageEditorSession(imageId, gateway),
    [imageId, gateway]
  );
  const state = useSyncExternalStore(
    session.subscribeScreen,
    session.getScreenState,
    session.getScreenState
  );
  useEffect(() => {
    void session.load();
    return session.cancelPending;
  }, [session]);
  return { session, state };
}
