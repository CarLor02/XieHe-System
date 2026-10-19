import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout } from '../theme';

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

export function Screen({ children }: PropsWithChildren) {
  return <View style={styles.screen}>{children}</View>;
}

export function Header({
  title,
  subtitle,
  back,
  right,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.primary, '#8B45EB', '#6D28D9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
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
      {!!children && <View style={{ marginTop: 18 }}>{children}</View>}
    </LinearGradient>
  );
}

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

export function FormContent({ children }: PropsWithChildren) {
  return (
    <KeyboardAvoidingView
      style={layout.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Content>{children}</Content>
    </KeyboardAvoidingView>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
}) {
  const foreground =
    variant === 'primary'
      ? '#FFF'
      : variant === 'danger'
        ? colors.danger
        : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            variant === 'primary'
              ? colors.primary
              : variant === 'danger'
                ? colors.dangerLight
                : variant === 'ghost'
                  ? 'transparent'
                  : colors.primaryLight,
          opacity: disabled || loading ? 0.5 : pressed ? 0.75 : 1,
          minHeight: compact ? 42 : 50,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        icon && <Icon name={icon} color={foreground} size={18} />
      )}
      <Text
        style={{
          color: foreground,
          fontSize: compact ? 13 : 15,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  name,
  label,
  onPress,
  light = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  light?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: light ? '#FFFFFF25' : colors.primaryLight,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Icon name={name} color={light ? '#FFF' : colors.primary} size={21} />
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={layout.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 100, textAlignVertical: 'top' },
          error && { borderColor: colors.danger },
          props.style,
        ]}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Icon name="search-outline" size={19} color={colors.faint} />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.searchInput}
      />
      {!!value && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="清空搜索"
          hitSlop={12}
          onPress={() => onChangeText('')}
        >
          <Icon name="close-circle" color={colors.faint} size={18} />
        </Pressable>
      )}
    </View>
  );
}

export function Tag({
  text,
  tone = 'primary',
}: {
  text: string;
  tone?: 'primary' | 'success' | 'warning' | 'muted' | 'danger';
}) {
  const palette = {
    primary: [colors.primaryLight, colors.primary],
    success: [colors.successLight, colors.success],
    warning: [colors.warningLight, colors.warning],
    muted: [colors.background, colors.muted],
    danger: [colors.dangerLight, colors.danger],
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: palette[0] }]}>
      <Text style={{ fontSize: 11, fontWeight: '500', color: palette[1] }}>
        {text}
      </Text>
    </View>
  );
}

export function Notice({
  children,
  tone = 'primary',
}: PropsWithChildren<{ tone?: 'primary' | 'warning' }>) {
  return (
    <View
      style={[
        styles.notice,
        {
          backgroundColor:
            tone === 'primary' ? colors.primaryLight : colors.warningLight,
        },
      ]}
    >
      <Icon
        name="information-circle-outline"
        size={18}
        color={tone === 'primary' ? colors.primary : colors.warning}
      />
      <Text
        style={[
          layout.muted,
          {
            flex: 1,
            color: tone === 'primary' ? colors.primaryDark : colors.warning,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={layout.muted}>{label}</Text>
      <Text selectable style={[layout.body, { flex: 1, textAlign: 'right' }]}>
        {value ?? '未填写'}
      </Text>
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={layout.between}>
      <Text accessibilityRole="header" style={layout.heading}>
        {title}
      </Text>
      {!!action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ paddingVertical: 8 }}
        >
          <Text style={{ color: colors.primary, fontSize: 12 }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function LoadingState({ label = '正在加载…' }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} />
      <Text style={layout.muted}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <View accessibilityRole="alert" style={{ gap: 14 }}>
        <Text style={styles.errorText}>{message}</Text>
        {onRetry && (
          <Button
            title="重新加载"
            variant="secondary"
            icon="refresh-outline"
            compact
            onPress={onRetry}
          />
        )}
      </View>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
}: {
  title: string;
  description?: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={32} />
      </View>
      <Text style={layout.heading}>{title}</Text>
      {!!description && (
        <Text style={[layout.muted, { textAlign: 'center' }]}>
          {description}
        </Text>
      )}
    </View>
  );
}

export function ChoiceSheet({
  title,
  open,
  onClose,
  children,
}: PropsWithChildren<{ title: string; open: boolean; onClose: () => void }>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭弹窗"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          <View style={styles.handle} />
          <View style={layout.between}>
            <Text style={layout.heading}>{title}</Text>
            <IconButton name="close" label="关闭" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ gap: 10, paddingTop: 16 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function Choice({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={title}
      style={[
        styles.choice,
        selected && {
          backgroundColor: colors.primaryLight,
          borderColor: '#D8C5FA',
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          layout.body,
          selected && { color: colors.primary, fontWeight: '600' },
        ]}
      >
        {title}
      </Text>
      {selected && <Icon name="checkmark-circle" size={20} />}
    </Pressable>
  );
}

export function Pagination({
  page,
  total,
  pageSize = 20,
  loading,
  onChange,
}: {
  page: number;
  total: number;
  pageSize?: number;
  loading: boolean;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <View style={layout.between}>
      <Button
        title="上一页"
        variant="secondary"
        compact
        disabled={loading || page <= 1}
        onPress={() => onChange(page - 1)}
      />
      <Text style={layout.muted}>
        {page} / {pages}
      </Text>
      <Button
        title="下一页"
        variant="secondary"
        compact
        disabled={loading || page >= pages}
        onPress={() => onChange(page + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  headerSubtitle: {
    color: '#E9DDFF',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 3px 12px rgba(30,41,59,0.035)',
  },
  button: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  input: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#FAFBFD',
    minHeight: 50,
  },
  errorText: { fontSize: 13, lineHeight: 21, color: colors.danger },
  search: {
    minHeight: 46,
    backgroundColor: '#FFFFFFF2',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 9,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 13,
    outlineWidth: 0,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 13,
    borderRadius: 13,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    paddingVertical: 10,
  },
  state: {
    paddingVertical: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 14,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#0F172A66',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#DCE1EA',
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 18,
  },
  choice: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
