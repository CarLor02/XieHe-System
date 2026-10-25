import type { ReactElement } from 'react';

export interface ButtonSurfaceProps {
  label: string;
  onPress: () => void;
  disabled: boolean;
  busy?: boolean;
  backgroundColor: string;
  foregroundColor: string;
  size: 'regular' | 'compact' | 'icon';
  children: ReactElement;
}
