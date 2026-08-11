'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useImageViewerController } from '@/app/imaging/features/image-viewer/application/hooks/useImageViewerController';
import {
  AnnotationCanvas,
  StandardDistanceWarningDialog,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas';
import { StudyHeader } from '@/app/imaging/features/image-viewer/features/study';
import { AnnotationToolbar } from '@/app/imaging/features/image-viewer/features/toolbar';
import { AppMessageDialog } from '@/components/overlay/overlay-components';

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
    annotationConflictDialogProps,
    studyLoading,
    studyLoadError,
    retryStudyLoad,
  } = useImageViewerController({ imageId });

  if (studyLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 text-gray-100">
        正在加载影像数据...
      </div>
    );
  }

  if (studyLoadError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 px-4 text-gray-100">
        <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6 text-center">
          <h1 className="text-lg font-semibold">影像数据加载失败</h1>
          <p className="mt-3 text-sm text-gray-300">{studyLoadError}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={returnTo}
              className="rounded-md border border-gray-600 px-4 py-2 text-sm hover:bg-gray-700"
            >
              返回影像中心
            </Link>
            <button
              type="button"
              onClick={retryStudyLoad}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      <AppMessageDialog
        {...annotationConflictDialogProps}
        buttonLabel="知道了"
      />
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          加载中...
        </div>
      }
    >
      <ImageViewerContent />
    </Suspense>
  );
}
