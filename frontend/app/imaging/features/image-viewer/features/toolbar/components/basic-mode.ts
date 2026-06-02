export enum BasicMode {
  Move = 'Move',
  VertebraCornerRectify = 'VertebraCornerRectify',
  MeasurementDerive = 'MeasurementDerive',
}

export const BASIC_MODE_LABELS: Record<BasicMode, string> = {
  [BasicMode.Move]: '手动标注',
  [BasicMode.VertebraCornerRectify]: '椎体点位纠正',
  [BasicMode.MeasurementDerive]: '测量项派生',
};

export const DEFAULT_BASIC_MODES: BasicMode[] = [
  BasicMode.Move,
  BasicMode.VertebraCornerRectify,
  BasicMode.MeasurementDerive,
];

export const NON_DERIVE_BASIC_MODES: BasicMode[] = [
  BasicMode.Move,
  BasicMode.VertebraCornerRectify,
];
