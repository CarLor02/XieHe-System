import brand from './brand.json';

// 品牌数据同时供 Expo 构建配置读取；此层不能依赖 React Native 或原生模块。
export const palette = {
  brand,
  white: '#FFFFFF',
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  input: '#FAFBFD',
  emerald: { 50: '#ECFDF5', 400: '#34D399', 500: '#10B981', 600: '#059669' },
  amber: { 50: '#FFFBEB', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706' },
  red: { 50: '#FEF2F2', 400: '#F87171', 500: '#EF4444', 600: '#DC2626' },
  orange: { 50: '#FFF7ED', 400: '#FB923C', 500: '#F97316' },
  sky: { 50: '#F0F9FF', 400: '#38BDF8', 500: '#0EA5E9', 600: '#0284C7' },
  blue: { 500: '#3B82F6' },
  teal: { 50: '#F0FDFA', 500: '#14B8A6', 600: '#0D9488' },
  pink: { 50: '#FDF2F8', 600: '#DB2777' },
  indigo: { 50: '#EEF2FF', 600: '#4F46E5' },
  rose: { 500: '#F43F5E' },
} as const;
