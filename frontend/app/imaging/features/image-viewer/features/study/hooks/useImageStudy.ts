import { useCallback, useState } from 'react';
import type { StudyEditorData } from '@xiehe/imaging-core/editor';

/**
 * study/image payload 拉取状态容器。
 */
export function useImageStudy() {
  const [studyData, setStudyData] = useState<StudyEditorData | null>(null);
  const [studyLoading, setStudyLoading] = useState(true);
  const [studyLoadError, setStudyLoadError] = useState<string | null>(null);
  const [studyReloadToken, setStudyReloadToken] = useState(0);
  const [imageList, setImageList] = useState<string[]>([]);
  const [annotationVersion, setAnnotationVersion] = useState(0);
  const [imageNaturalSize, setImageNaturalSize] = useState<
    {
      width: number;
      height: number;
    }
  >({ width: 0, height: 0 });
  const retryStudyLoad = useCallback(() => {
    setStudyReloadToken(token => token + 1);
  }, []);

  return {
    studyData,
    setStudyData,
    studyLoading,
    setStudyLoading,
    studyLoadError,
    setStudyLoadError,
    studyReloadToken,
    retryStudyLoad,
    imageList,
    setImageList,
    annotationVersion,
    setAnnotationVersion,
    imageNaturalSize,
    setImageNaturalSize,
  };
}
