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

export default async function ImageViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ImageViewer imageId={id} />;
}
