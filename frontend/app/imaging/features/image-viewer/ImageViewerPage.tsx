'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useImageViewerController } from '@/app/imaging/features/image-viewer/application/hooks/useImageViewerController';
import { AnnotationCanvas } from '@/app/imaging/features/image-viewer/features/annotation-canvas';
import StandardDistanceWarningDialog from '@/app/imaging/features/image-viewer/features/annotation-canvas/components/StandardDistanceWarningDialog';
import { StudyHeader } from '@/app/imaging/features/image-viewer/features/study';
import { AnnotationToolbar } from '@/app/imaging/features/image-viewer/features/toolbar';

interface ImageViewerProps {
  imageId: string;
  returnTo: string;
}

function ImageViewer({ imageId, returnTo }: ImageViewerProps) {
  const {
    headerProps,
    canvasProps,
    toolbarProps,
    standardDistanceWarningProps,
  } = useImageViewerController({ imageId });

  return (
    <>
      <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-hidden">
        <StudyHeader {...headerProps} returnHref={returnTo} />

        <div className="flex-1 flex min-h-0 flex-col overflow-hidden md:flex-row">
          <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
            <div className="bg-black flex min-h-0 items-center justify-center relative flex-1 overflow-hidden">
              <AnnotationCanvas {...canvasProps} />
            </div>
          </div>

          <AnnotationToolbar {...toolbarProps} />
        </div>
      </div>

      <StandardDistanceWarningDialog {...standardDistanceWarningProps} />
    </>
  );
}

function ImageViewerContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const returnTo = searchParams.get('returnTo') || '/imaging';

  if (!id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">错误</h1>
          <p className="text-gray-600">缺少图像 ID 参数</p>
        </div>
      </div>
    );
  }

  return <ImageViewer imageId={id} returnTo={returnTo} />;
}

export default function ImageViewerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <ImageViewerContent />
    </Suspense>
  );
}
