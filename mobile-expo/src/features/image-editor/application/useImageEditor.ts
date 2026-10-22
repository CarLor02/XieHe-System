import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ImageEditorSession } from './ImageEditorSession';
import type { ImageEditorGateway } from './ports';
import { EditorReadoutStore } from './EditorReadoutStore';

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
  const readouts = useMemo(() => new EditorReadoutStore(session), [session]);
  useEffect(() => {
    void session.load();
    return session.cancelPending;
  }, [session]);
  return { session, state, readouts };
}
