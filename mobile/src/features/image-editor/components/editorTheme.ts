import { StyleSheet } from 'react-native';

// 与 Web 阅片器的 gray-900/800、blue-600 和标注颜色保持一致。
export const editorColors = {
  background: '#030712',
  surface: '#111827',
  panel: '#1F2937',
  raised: '#374151',
  border: '#374151',
  text: '#F9FAFB',
  muted: '#9CA3AF',
  blue: '#2563EB',
  blueLight: '#93C5FD',
  success: '#34D399',
  danger: '#F87171',
};
export const editorStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { color: editorColors.text, fontSize: 14, fontWeight: '600' },
  muted: { color: editorColors.muted, fontSize: 12, lineHeight: 18 },
  panel: {
    backgroundColor: editorColors.panel,
    borderTopWidth: 1,
    borderColor: editorColors.border,
  },
  field: {
    color: editorColors.text,
    backgroundColor: editorColors.surface,
    borderColor: editorColors.border,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 14,
  },
});
