import { palette as p } from './palette';

export const colors = {
  primary: p.brand.primary,
  primaryDark: p.brand.dark,
  primaryLight: p.brand.light,
  background: p.slate[50],
  card: p.white,
  text: p.slate[800],
  textSecondary: p.slate[700],
  muted: p.slate[500],
  faint: p.slate[400],
  subtle: p.slate[300],
  border: p.slate[100],
  divider: p.slate[50],
  success: p.emerald[600],
  successLight: p.emerald[50],
  warning: p.amber[600],
  warningLight: p.amber[50],
  danger: p.red[600],
  dangerLight: p.red[50],
  dangerAccent: p.red[500],
  dangerSoft: p.red[400],
  onPrimary: p.white,
  onPrimaryMuted: `${p.white}CC`,
  onPrimarySubtle: `${p.white}B3`,
  onPrimarySurface: `${p.white}33`,
  onPrimaryControl: `${p.white}25`,
  input: p.input,
  selectedBorder: p.brand.border,
  searchSurface: `${p.white}F2`,
  translucentCard: `${p.white}ED`,
  brandDecoration: `${p.brand.border}55`,
  brandDecorationStrong: `${p.brand.highlight}60`,
  inverseSurface: p.slate[900],
  onInverseMuted: p.slate[300],
  onInverseBrand: p.brand.highlight,
} as const;

// 分类装饰独立于品牌和成功/失败状态，换品牌色不改变分类含义。
export const accents = {
  orange: {
    foreground: p.orange[500],
    background: p.orange[50],
    marker: p.orange[400],
  },
  sky: { foreground: p.sky[500], background: p.sky[50], marker: p.sky[400] },
} as const;

export const tagColors = {
  primary: [colors.primaryLight, colors.primary],
  success: [colors.successLight, colors.success],
  warning: [colors.warningLight, colors.warning],
  muted: [colors.background, colors.muted],
  danger: [colors.dangerLight, colors.danger],
  pink: [p.pink[50], p.pink[600]],
  sky: [p.sky[50], p.sky[600]],
  teal: [p.teal[50], p.teal[600]],
  indigo: [p.indigo[50], p.indigo[600]],
} as const;
