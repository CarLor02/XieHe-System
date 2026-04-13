import { useState } from 'react';
import { ImageData, StudyData } from '../types';

/**
 * study/image payload 拉取状态容器。
 */
export function useImageStudy() {
  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [studyLoading, setStudyLoading] = useState(true);
  const [imageList, setImageList] = useState<string[]>([]);
  const [imageNaturalSize, setImageNaturalSize] = useState<
    {
      width: number;
      height: number;
    }
  >({width:0, height:0});

  return {
    studyData,
    setStudyData,
    studyLoading,
    setStudyLoading,
    imageList,
    setImageList,
    imageNaturalSize,
    setImageNaturalSize,
  };
}

