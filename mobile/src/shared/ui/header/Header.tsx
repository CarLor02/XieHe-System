import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, layout, spacing } from '@/shared/theme';
import { IconButton } from '@/shared/ui/icon-button';

export function Header({
  title,
  subtitle,
  back,
  right,
  children,
  roundedBottom = false,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  roundedBottom?: boolean;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={['#7C3AED', '#A855F7', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.header,
        { paddingTop: Math.max(insets.top, spacing.md) + spacing.sm },
        roundedBottom && {
          borderBottomLeftRadius: spacing.xl,
          borderBottomRightRadius: spacing.xl,
        },
      ]}
    >
      <View style={layout.between}>
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
          <View style={layout.flex}>
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
      {!!children && <View style={{ marginTop: spacing.md }}>{children}</View>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
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
