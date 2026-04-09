import { useState } from 'react';
import { shouldClearToolState } from '../canvas/tools/tool-state';
import { Point } from '../types';

/**
 * 页面级画布工具状态。
 * 当前先收拢选中的工具、临时点击点与标准距离交互入口。
 */
export function useCanvasInteraction() {
  const [selectedTool, setSelectedTool] = useState('hand');
  const [clickedPoints, setClickedPoints] = useState<Point[]>([]);
  const [isSettingStandardDistance, setIsSettingStandardDistance] =
    useState(false);
  const [showStandardDistanceWarning, setShowStandardDistanceWarning] =
    useState(false);
  const [isImagePanLocked, setIsImagePanLocked] = useState(false);

  const handleToolChange = (newTool: string) => {
    if (shouldClearToolState(selectedTool, newTool)) {
      setClickedPoints([]);
    }
    setSelectedTool(newTool);
  };

  const activateHandMode = () => {
    setSelectedTool('hand');
    if (isSettingStandardDistance) {
      setIsSettingStandardDistance(false);
    }
  };

  return {
    selectedTool,
    setSelectedTool,
    handleToolChange,
    activateHandMode,
    clickedPoints,
    setClickedPoints,
    isSettingStandardDistance,
    setIsSettingStandardDistance,
    showStandardDistanceWarning,
    setShowStandardDistanceWarning,
    isImagePanLocked,
    setIsImagePanLocked,
  };
}
