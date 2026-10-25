import { BottomSheet } from '@expo/ui/community/bottom-sheet';
import type { PropsWithChildren } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radii, sizes, spacing } from '@/shared/theme';
import { IconButton } from '@/shared/ui/icon-button';
import { SheetTitle } from './SheetTitle';

export function ChoiceSheet({
  title,
  open,
  onClose,
  dismissible = true,
  children,
}: PropsWithChildren<{
  title: string;
  open: boolean;
  onClose: () => void;
  dismissible?: boolean;
}>) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <BottomSheet
      index={open ? 0 : -1}
      enablePanDownToClose={dismissible}
      enableDynamicSizing
      backgroundStyle={styles.background}
      onClose={() => {
        // 程序关闭也会回调，避免旧弹层的关闭通知覆盖后续打开的弹层。
        if (open && dismissible) onClose();
      }}
    >
      {/* 保留受限高度的 RN 内容区；拖动、遮罩和原生返回由 Expo UI 处理。 */}
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            maxHeight: height * 0.8,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        <View style={layout.between}>
          <SheetTitle title={title} />
          <IconButton
            name="close"
            label="关闭"
            disabled={!dismissible}
            onPress={onClose}
          />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          nestedScrollEnabled
          style={styles.scroll}
          contentContainerStyle={styles.content}
        >
          {children}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.card,
    padding: 0,
    borderTopLeftRadius: radii.large,
    borderTopRightRadius: radii.large,
    maxWidth: sizes.sheetMaxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  sheet: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    width: '100%',
    maxWidth: sizes.sheetMaxWidth,
    alignSelf: 'center',
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: spacing.sm, paddingTop: spacing.md },
});
