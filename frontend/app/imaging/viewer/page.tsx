'use client';

import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';
import ImageViewer from './ImageViewer';

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
