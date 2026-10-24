import { ScrollView, type ScrollViewProps } from 'react-native';
import { layout } from '@/shared/theme';

export function Content({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[layout.content, contentContainerStyle]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
