import type { ImageFile } from '@/services/imageServices/imageFileService';
import type { PreviewLoadState } from '../hooks/useImagePreviewQueue';

interface ImagePreviewProps {
  imageFile: ImageFile;
  imageUrls: Record<number, string>;
  previewStates: Record<number, PreviewLoadState>;
  imgClassName: string;
  loadingIconClassName: string;
  fallbackIconClassName: string;
  onPreviewError: (fileId: number) => void;
}

function PreviewFallback({ iconClassName }: { iconClassName: string }) {
  return (
    <div className="placeholder-icon w-full h-full flex items-center justify-center text-gray-400">
      <i className={iconClassName}></i>
    </div>
  );
}

export default function ImagePreview({
  imageFile,
  imageUrls,
  previewStates,
  imgClassName,
  loadingIconClassName,
  fallbackIconClassName,
  onPreviewError,
}: ImagePreviewProps) {
  const previewUrl = imageUrls[imageFile.id];
  const previewState = previewStates[imageFile.id];

  if (previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={imageFile.original_filename}
        className={imgClassName}
        loading="lazy"
        decoding="async"
        onError={() => onPreviewError(imageFile.id)}
      />
    );
  }

  if (previewState === 'fallback') {
    return <PreviewFallback iconClassName={fallbackIconClassName} />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <i className={loadingIconClassName}></i>
    </div>
  );
}
