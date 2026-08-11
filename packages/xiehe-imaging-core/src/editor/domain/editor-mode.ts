export enum BasicMode {
  Move = 'Move',
  VertebraCornerRectify = 'VertebraCornerRectify',
  MeasurementDerive = 'MeasurementDerive',
}

export type ToolTab =
  | 'measurement'
  | 'keypoint'
  | 'vertebra-inner-rectify'
  | 'vertebra-label-offset';

export type AdjustMode = 'none' | 'zoom' | 'brightness' | 'contrast';

export interface KeypointSequenceSession {
  groupName: string;
  keypointIds: string[];
  currentIndex: number;
}

export const DEFAULT_BASIC_MODES: readonly BasicMode[] = [
  BasicMode.Move,
  BasicMode.VertebraCornerRectify,
  BasicMode.MeasurementDerive,
];

export const NON_DERIVE_BASIC_MODES: readonly BasicMode[] = [
  BasicMode.Move,
  BasicMode.VertebraCornerRectify,
];

const DEFAULT_TOOL_TABS: readonly ToolTab[] = ['measurement', 'keypoint'];
const VERTEBRA_RECTIFY_TOOL_TABS: readonly ToolTab[] = [
  'vertebra-inner-rectify',
  'vertebra-label-offset',
];

export function getToolTabsForBasicMode(
  currentBasicMode: BasicMode
): readonly ToolTab[] {
  if (currentBasicMode === BasicMode.VertebraCornerRectify) {
    return VERTEBRA_RECTIFY_TOOL_TABS;
  }
  if (currentBasicMode === BasicMode.MeasurementDerive) {
    return ['measurement'];
  }
  return DEFAULT_TOOL_TABS;
}

export function getEffectiveToolTab(
  currentBasicMode: BasicMode,
  activeToolTab: ToolTab
): ToolTab {
  const visibleTabs = getToolTabsForBasicMode(currentBasicMode);
  return visibleTabs.includes(activeToolTab) ? activeToolTab : visibleTabs[0];
}

export function shouldShowAuxiliaryTools(currentBasicMode: BasicMode): boolean {
  return currentBasicMode === BasicMode.Move;
}
