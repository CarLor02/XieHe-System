'use client';

import { AnnotationCanvas } from './features/annotation-canvas';
import StandardDistanceWarningDialog from './features/annotation-canvas/components/StandardDistanceWarningDialog';
import { AnnotationToolbar } from './features/toolbar';
import { StudyHeader } from './features/study';
import { useImageViewerController } from './application/hooks/useImageViewerController';

interface ImageViewerProps {
  imageId: string;
}

export default function ImageViewer({ imageId }: ImageViewerProps) {
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
