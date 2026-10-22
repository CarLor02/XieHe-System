import { isSupportedImage } from '../domain/supportedImage';
import { useEffect, useState } from 'react';
import type {
  ImageFile,
  ImageFileDownloadUrlsResponse,
} from '@xiehe/api-contracts';
import { useWorkspace } from '../../../application/AppProvider';

export function useImageThumbnails(images?: ImageFile[]) {
  const { services } = useWorkspace();
  const [result, setResult] = useState<{
    source: ImageFile[];
    urls: ImageFileDownloadUrlsResponse['items'];
  }>();
  useEffect(() => {
    if (!images?.length) return;
    let active = true;
    // Only request derivatives for the visible page; never fetch full medical images for list thumbnails.
    void services.imaging
      .getDownloadUrls(
        images
          .filter(image => isSupportedImage(image.file_type))
          .map(image => image.id),
        { variant: 'thumbnail' }
      )
      .then(response => {
        if (active) setResult({ source: images, urls: response.items });
      })
      .catch(() => {
        if (active) setResult({ source: images, urls: {} });
      });
    return () => {
      active = false;
    };
  }, [services, images]);
  return result && result.source === images ? result.urls : {};
}
