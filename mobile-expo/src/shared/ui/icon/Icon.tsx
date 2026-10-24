import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors } from '../../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({
  name,
  color = colors.primary,
  size = 22,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return <Ionicons name={name} color={color} size={size} />;
}
