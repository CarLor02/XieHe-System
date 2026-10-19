import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primaryLight: '#F3EDFF',
  background: '#F6F7FB',
  card: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  faint: '#94A3B8',
  border: '#E9EDF3',
  success: '#059669',
  successLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
};

export const layout = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  flex: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  heading: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, lineHeight: 22, color: colors.text },
  muted: { fontSize: 12, lineHeight: 19, color: colors.muted },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
});
