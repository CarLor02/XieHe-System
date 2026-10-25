import { Text } from 'react-native';
import { layout } from '@/shared/theme';

export function SheetTitle({ title }: { title: string }) {
  return (
    <Text accessibilityRole="header" style={[layout.heading, layout.flex]}>
      {title}
    </Text>
  );
}
