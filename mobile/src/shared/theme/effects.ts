import { palette as p } from './palette';

export const gradients = {
  brand: [p.brand.accent, p.brand.primary],
  header: [p.brand.primary, p.brand.accent, p.brand.primary],
  background: [p.brand.light, p.brand.subtle, p.brand.light],
  sky: [p.sky[400], p.blue[500]],
  teal: [p.emerald[400], p.teal[500]],
  orange: [p.orange[400], p.rose[500]],
  amber: [p.amber[400], p.amber[500]],
  emerald: [p.emerald[400], p.emerald[500]],
} as const;

export const shadows = {
  card: `0 4px 16px ${p.slate[400]}1A`,
  filterChip: `0 2px 3px ${p.slate[400]}14`,
  search: `0 4px 12px ${p.brand.primary}1F`,
  brandCard: `0 4px 8px ${p.brand.primary}24`,
  brandAction: `0 3px 6px ${p.brand.primary}33`,
  brandLogo: `0 10px 26px ${p.brand.primary}38`,
  icon: `0 3px 6px ${p.slate[900]}1A`,
} as const;
