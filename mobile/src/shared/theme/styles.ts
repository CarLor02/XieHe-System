import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing, radii, fontSizes, sizes, interactionOpacity } from './tokens';

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
