import { useCallback } from 'react';
import { ImageSize, Point } from '@/app/imaging/viewer/shared/types';

interface UseStandardDistanceActionsOptions {
  standardDistance: number | null;
  standardDistanceValue: string;
  standardDistancePoints: Point[];
  imageNaturalSize: ImageSize | null;
  isSettingStandardDistance: boolean;
  setShowStandardDistanceWarning: (value: boolean) => void;
  setSelectedTool: (toolId: string) => void;
  handleToolChange: (toolId: string) => void;
  setIsSettingStandardDistance: (value: boolean) => void;
  setStandardDistancePoints: (points: Point[]) => void;
  setStandardDistance: (distance: number | null) => void;
  recalculateAVTandTS: (
    imageNaturalSize: ImageSize | null,
    newStandardDistance?: number,
    newStandardDistancePoints?: Point[]
  ) => void;
}

export function useStandardDistanceActions({
  standardDistance,
  standardDistanceValue,
  standardDistancePoints,
  imageNaturalSize,
  isSettingStandardDistance,
  setShowStandardDistanceWarning,
  setSelectedTool,
  handleToolChange,
  setIsSettingStandardDistance,
  setStandardDistancePoints,
  setStandardDistance,
  recalculateAVTandTS,
}: UseStandardDistanceActionsOptions) {
  const handleSelectTool = useCallback(
    (toolId: string) => {
      if ((toolId === 'avt' || toolId === 'tts') && !standardDistance) {
        setShowStandardDistanceWarning(true);
        setSelectedTool('hand');
        return;
      }

      handleToolChange(toolId);
      if (isSettingStandardDistance) {
        setIsSettingStandardDistance(false);
        setStandardDistancePoints([]);
      }
    },
    [
      handleToolChange,
      isSettingStandardDistance,
      setIsSettingStandardDistance,
      setSelectedTool,
      setShowStandardDistanceWarning,
      setStandardDistancePoints,
      standardDistance,
    ]
  );

  const handleStartStandardDistance = useCallback(() => {
    setIsSettingStandardDistance(true);
    setStandardDistancePoints([]);
    setSelectedTool('hand');
  }, [setIsSettingStandardDistance, setSelectedTool, setStandardDistancePoints]);

  const handleStandardDistanceInputBlur = useCallback(() => {
    const value = parseFloat(standardDistanceValue);
    if (!isNaN(value) && value > 0 && standardDistancePoints.length === 2) {
      recalculateAVTandTS(imageNaturalSize, value, standardDistancePoints);
      setStandardDistance(value);
    }
  }, [
    imageNaturalSize,
    recalculateAVTandTS,
    setStandardDistance,
    standardDistancePoints,
    standardDistanceValue,
  ]);

  const handleStandardDistanceInputEnter = useCallback(() => {
    const value = parseFloat(standardDistanceValue);
    if (!isNaN(value) && value > 0 && standardDistancePoints.length === 2) {
      recalculateAVTandTS(imageNaturalSize, value, standardDistancePoints);
      setStandardDistance(value);
      setIsSettingStandardDistance(false);
    }
  }, [
    imageNaturalSize,
    recalculateAVTandTS,
    setIsSettingStandardDistance,
    setStandardDistance,
    standardDistancePoints,
    standardDistanceValue,
  ]);

  return {
    handleSelectTool,
    handleStartStandardDistance,
    handleStandardDistanceInputBlur,
    handleStandardDistanceInputEnter,
  };
}
