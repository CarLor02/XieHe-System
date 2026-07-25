import { useCallback, useMemo, useState } from 'react';

import { keypointsToPersistedLayer } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-layer-mapper';
import { getCompleteSelectableVertebraGroups } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-operations';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint';
import type {
  CfhAnnotation,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

interface UseKeypointLayerStateOptions {
  examType: string;
  isKeypointExam: boolean;
}

/**
 * 关键点 feature 的 React 状态适配。
 *
 * 此 hook 不读取或修改 measurements，跨领域重算由同步 feature 负责。
 */
export function useKeypointLayerState({
  examType,
  isKeypointExam,
}: UseKeypointLayerStateOptions) {
  const [vertebraeLayer, setVertebraeLayer] = useState<VertebraAnnotation[]>(
    []
  );
  const [keypoints, setKeypoints] = useState<KeypointAnnotation[]>([]);
  const [cfhAnnotation, setCfhAnnotation] = useState<CfhAnnotation | null>(
    null
  );
  const [showVertebraeLayer, setShowVertebraeLayer] = useState(false);

  const completeVertebraGroups = useMemo(
    () => getCompleteSelectableVertebraGroups(keypoints, examType),
    [examType, keypoints]
  );

  const activeVertebraeLayer = useMemo(
    () =>
      isKeypointExam && keypoints.length > 0
        ? keypointsToPersistedLayer(keypoints)
        : vertebraeLayer,
    [isKeypointExam, keypoints, vertebraeLayer]
  );

  const clearKeypointLayer = useCallback(() => {
    setVertebraeLayer([]);
    setKeypoints([]);
    setCfhAnnotation(null);
    setShowVertebraeLayer(false);
  }, []);

  return {
    vertebraeLayer,
    setVertebraeLayer,
    keypoints,
    setKeypoints,
    cfhAnnotation,
    setCfhAnnotation,
    showVertebraeLayer,
    setShowVertebraeLayer,
    activeVertebraeLayer,
    completeVertebraGroups,
    clearKeypointLayer,
  };
}
