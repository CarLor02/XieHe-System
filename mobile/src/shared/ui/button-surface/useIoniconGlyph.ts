import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import type { IconName } from '@/shared/ui/icon';

export function useIoniconGlyph(name?: IconName) {
  const [loaded, error] = useFonts(Ionicons.font);
  if (error) throw error;
  if (!loaded || !name) return undefined;
  const glyph = Ionicons.glyphMap[name];
  return {
    character: typeof glyph === 'number' ? String.fromCodePoint(glyph) : glyph,
    // SwiftUI 用字体文件的 PostScript 名；Compose 用 expo-font 注册的别名。
    family: Platform.OS === 'ios' ? 'Ionicons' : Ionicons.getFontFamily(),
  };
}
