import type { ReactElement } from 'react';
import type { IconName } from '@/shared/ui/icon';

export interface ButtonSurfaceProps {
  label: string;
  onPress: () => void;
  disabled: boolean;
  busy?: boolean;
  icon?: IconName;
  backgroundColor: string;
  foregroundColor: string;
  size: 'regular' | 'compact' | 'icon';
  // Web 保留 RN 标签；原生端使用 label/icon 构建同一原生视图树中的内容。
  children: ReactElement;
}
