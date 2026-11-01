import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useWorkspace } from '@/application/AppProvider';
import { pickUploadImages } from '@/infrastructure/files/pickUploadImages';
import { flipUploadImage } from '@/infrastructure/files/flipUploadImage';
import { readEditedUploadFile } from '@/infrastructure/files/readEditedUploadFile';
import type { ImageCropper } from '@/shared/ui/image-cropper';
import { ImageUploadSession } from './ImageUploadSession';

export function useImageUpload(cropper: Pick<ImageCropper, 'open'>) {
  const { services } = useWorkspace();
  const [session] = useState(
    () =>
      new ImageUploadSession({
        pick: pickUploadImages,
        flip: flipUploadImage,
        async crop(file) {
          const image = await cropper.open(file.uri);
          return image ? readEditedUploadFile(file.name, image) : null;
        },
        upload: services.upload,
      })
  );
  const state = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  );
  const busy = state.activity !== 'idle';
  usePreventRemove(busy, () => undefined);
  useEffect(() => {
    session.activate();
    return () => session.dispose();
  }, [session]);
  return { ...state, session, busy };
}
