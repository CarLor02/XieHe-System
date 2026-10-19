import { useState } from 'react';
import { Linking } from 'react-native';
import type { ImageFile } from '@xiehe/api-contracts';
import { getApiErrorMessage } from '@xiehe/api-client';
import { useWorkspace } from '../../../application/AppProvider';

export function useImageActions(onDeleted: () => void) {
  const { services } = useWorkspace();
  const [target, setTarget] = useState<ImageFile | null>(null);
  const [busyId, setBusyId] = useState<number>();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const openOriginal = async (image: ImageFile) => {
    setError('');
    setBusyId(image.id);
    try {
      const { url } = await services.imaging.getDownloadUrl(image.id);
      // The system browser handles the original file; no implicit full-file download into app storage.
      await Linking.openURL(url);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusyId(undefined);
    }
  };
  const confirmDelete = async () => {
    if (!target || deleting) return;
    setError('');
    setDeleting(true);
    try {
      await services.imaging.delete(target.id);
      setTarget(null);
      onDeleted();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setDeleting(false);
    }
  };
  const selectDelete = (image: ImageFile) => {
    setError('');
    setTarget(image);
  };
  const closeDelete = () => {
    if (!deleting) {
      setTarget(null);
      setError('');
    }
  };
  return {
    target,
    selectDelete,
    closeDelete,
    busyId,
    deleting,
    error,
    openOriginal,
    confirmDelete,
  };
}
