'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useImageViewerController } from './application/hooks/useImageViewerController';
import { AnnotationCanvas } from './features/annotation-canvas';
import StandardDistanceWarningDialog from './features/annotation-canvas/components/StandardDistanceWarningDialog';
import { StudyHeader } from './features/study';
import { AnnotationToolbar } from './features/toolbar';

interface ImageViewerProps {
  imageId: string;
}

function ImageViewer({ imageId }: ImageViewerProps) {
  const {
    headerProps,
    canvasProps,
    toolbarProps,
    standardDistanceWarningProps,
  } = useImageViewerController({ imageId });

  return (
    <>
      <div className="fixed inset-0 bg-gray-900 flex flex-col overflow-hidden">
        <StudyHeader {...headerProps} />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-black flex items-center justify-center relative flex-1 overflow-hidden">
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

  return <ImageViewer imageId={id} />;
}

export default function ImageViewerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <ImageViewerContent />
    </Suspense>
  );
}
