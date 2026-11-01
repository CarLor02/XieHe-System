import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { radii, shadows, colors as themeColors } from '@/shared/theme';

export function GradientIcon({
  name,
  colors,
  size = 40,
  iconSize = 20,
  radius = radii.control,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  colors: readonly [string, string];
  size?: number;
  iconSize?: number;
  radius?: number;
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: shadows.icon,
      }}
    >
      <Ionicons name={name} size={iconSize} color={themeColors.onPrimary} />
    </LinearGradient>
  );
}
