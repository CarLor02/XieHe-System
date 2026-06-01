export enum BasicMode {
  Move = 'Move',
  VertebraCornerRectify = 'VertebraCornerRectify',
  MeasurementDerive = 'MeasurementDerive',
}

export const BASIC_MODE_LABELS: Record<BasicMode, string> = {
  [BasicMode.Move]: '移动',
  [BasicMode.VertebraCornerRectify]: '椎体点位纠正',
  [BasicMode.MeasurementDerive]: '测量项派生',
};

export const BASIC_MODE_ICONS: Record<BasicMode, string> = {
  [BasicMode.Move]: 'ri-hand-line',
  [BasicMode.VertebraCornerRectify]: 'ri-focus-3-line',
  [BasicMode.MeasurementDerive]: 'ri-ruler-line',
};

export const DEFAULT_BASIC_MODES: BasicMode[] = [
  BasicMode.Move,
  BasicMode.VertebraCornerRectify,
  BasicMode.MeasurementDerive,
];
