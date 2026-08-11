import { BasicMode, type ToolTab } from '@xiehe/imaging-core/editor';

export interface ToolTabCopy {
  id: ToolTab;
  label: string;
  icon: string;
}

export const BASIC_MODE_LABELS: Readonly<Record<BasicMode, string>> = {
  [BasicMode.Move]: '手动标注',
  [BasicMode.VertebraCornerRectify]: '椎体点位纠正',
  [BasicMode.MeasurementDerive]: '测量项派生',
};

const TOOL_TAB_COPY: Readonly<Record<ToolTab, ToolTabCopy>> = {
  measurement: {
    id: 'measurement',
    label: '测量工具',
    icon: 'ri-ruler-line',
  },
  keypoint: { id: 'keypoint', label: '关键点', icon: 'ri-focus-3-line' },
  'vertebra-inner-rectify': {
    id: 'vertebra-inner-rectify',
    label: '椎体内纠正',
    icon: 'ri-focus-3-line',
  },
  'vertebra-label-offset': {
    id: 'vertebra-label-offset',
    label: '椎体序号偏移纠正',
    icon: 'ri-arrow-up-down-line',
  },
};

export function getToolTabCopy(toolTab: ToolTab): ToolTabCopy {
  return TOOL_TAB_COPY[toolTab];
}
