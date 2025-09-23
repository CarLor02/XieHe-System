
import ImageViewer from './ImageViewer';

export async function generateStaticParams() {
  return [
    { id: 'IMG001' },
    { id: 'IMG002' },
    { id: 'IMG003' },
    { id: 'IMG004' },
    { id: 'IMG005' },
    { id: 'IMG006' },
  ];
}

export default function ImageViewerPage({ params }: { params: { id: string } }) {
  return <ImageViewer imageId={params.id} />;
}
