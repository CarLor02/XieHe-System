export const OVERLAY_LAYER_CLASS_NAMES = {
  drawer: 'z-50',
  dropdown: 'z-[10001]',
  blocking: 'z-[10000]',
  modal: 'z-[11000]',
  toast: 'z-[12000]',
} as const;

export type OverlayLayer = keyof typeof OVERLAY_LAYER_CLASS_NAMES;
