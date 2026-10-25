import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primaryLight: '#F3EDFF',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  faint: '#94A3B8',
  border: '#F1F5F9',
  success: '#059669',
  successLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  onPrimary: '#FFFFFF',
  input: '#FAFBFD',
  selectedBorder: '#D8C5FA',
};

// 公共控件共享尺寸和状态参数，业务页面仍可按布局需要组合或覆盖。
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32 };
export const radii = { small: 8, control: 14, card: 16, large: 24, pill: 999 };
export const fontSizes = {
  badge: 10,
  caption: 12,
  small: 13,
  body: 14,
  control: 15,
  heading: 16,
  title: 20,
};
export const sizes = {
  control: 50,
  compactControl: 42,
  iconButton: 44,
  search: 44,
  multilineInput: 100,
  sheetMaxWidth: 600,
};
export const interactionOpacity = { disabled: 0.5, pressed: 0.75 };

export const layout = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.lg },
  title: { fontSize: fontSizes.title, fontWeight: '700', color: colors.text },
  heading: {
    fontSize: fontSizes.heading,
    fontWeight: '700',
    color: colors.text,
  },
  body: { fontSize: fontSizes.body, lineHeight: 22, color: colors.text },
  muted: { fontSize: fontSizes.caption, lineHeight: 19, color: colors.muted },
  label: {
    fontSize: fontSizes.small,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});

export const fieldStyles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: fontSizes.small, fontWeight: '600', color: colors.muted },
  control: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: fontSizes.control,
    color: colors.text,
    backgroundColor: colors.input,
    minHeight: sizes.control,
  },
  disabled: { opacity: interactionOpacity.disabled },
  invalid: { borderColor: colors.danger },
  error: { fontSize: fontSizes.small, lineHeight: 21, color: colors.danger },
});
