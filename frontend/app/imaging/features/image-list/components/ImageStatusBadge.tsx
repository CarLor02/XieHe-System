import type { ImageFile } from '@/services/imageServices/imageFileService';

interface ImageStatusBadgeProps {
  status: ImageFile['status'];
  variant: 'overlay' | 'inline';
}

function getStatusLabel(status: ImageFile['status']) {
  if (status === 'UPLOADED') return '已上传';
  if (status === 'PROCESSING') return '处理中';
  if (status === 'PROCESSED') return '已处理';
  return status;
}

function getOverlayClassName(status: ImageFile['status']) {
  if (status === 'UPLOADED') return 'bg-green-500/80 text-white';
  if (status === 'PROCESSING') return 'bg-blue-500/80 text-white';
  if (status === 'PROCESSED') return 'bg-purple-500/80 text-white';
  return 'bg-gray-500/80 text-white';
}

function getInlineClassName(status: ImageFile['status']) {
  if (status === 'UPLOADED') return 'bg-green-100 text-green-800';
  if (status === 'PROCESSING') return 'bg-blue-100 text-blue-800';
  if (status === 'PROCESSED') return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
}

export default function ImageStatusBadge({
  status,
  variant,
}: ImageStatusBadgeProps) {
  const className =
    variant === 'overlay'
      ? `text-xs px-2 py-1 rounded-full ${getOverlayClassName(status)}`
      : `text-sm px-3 py-1 rounded-full ${getInlineClassName(status)}`;

  return <span className={className}>{getStatusLabel(status)}</span>;
}
