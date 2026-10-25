import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, layout, sizes, spacing } from '@/shared/theme';
import { IconButton } from '@/shared/ui/icon-button';

export function Header({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={['#7C3AED', '#A855F7', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.header, { paddingTop: insets.top }]}
    >
      <View style={[layout.between, styles.titleRow]}>
        <View style={[layout.row, layout.flex]}>
          {back && (
            <IconButton
              name="arrow-back"
              label="返回"
              light
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/')
              }
            />
          )}
          <View style={[layout.flex, styles.titleContent]}>
            <Text accessibilityRole="header" style={styles.headerTitle}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            )}
          </View>
        </View>
        {right}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, flexShrink: 0 },
  // 安全区只由外层处理；标题行统一尺寸，大字体或长标题仍可自然增高。
  titleRow: { minHeight: sizes.header, paddingVertical: spacing.xs },
  titleContent: { minWidth: 0 },
  headerTitle: {
    color: colors.onPrimary,
    fontSize: fontSizes.title,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#E9DDFF',
    fontSize: fontSizes.caption,
    marginTop: spacing.xxs,
    lineHeight: 18,
  },
});
