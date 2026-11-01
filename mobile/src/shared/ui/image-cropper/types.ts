import type { ReactNode } from 'react';

export interface CroppedImage {
  uri: string;
  width: number;
  height: number;
}

export interface ImageCropper {
  open(uri: string): Promise<CroppedImage | null>;
  element: ReactNode;
}
