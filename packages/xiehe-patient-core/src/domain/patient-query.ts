export interface PatientQueryState {
  page: number;
  pageSize: number;
  searchTerm: string;
  gender: string;
  ageRange: string;
  status: string;
  hasImages: string;
  sortBy: string;
  sortOrder: string;
}

export interface PatientListQuery {
  page: number;
  page_size: number;
  search?: string;
  gender?: string;
  age_min?: number;
  age_max?: number;
  status?: string;
  has_images?: boolean;
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

export function createPatientQuery(state: PatientQueryState): PatientListQuery {
  const [rawMin, rawMax] = state.ageRange.split('-');
  const ageMin =
    rawMin === undefined || rawMin === '' ? Number.NaN : Number(rawMin);
  const ageMax =
    rawMax === undefined || rawMax === '' ? Number.NaN : Number(rawMax);
  return {
    page: state.page,
    page_size: state.pageSize,
    ...(state.searchTerm.trim() ? { search: state.searchTerm.trim() } : {}),
    ...(state.gender ? { gender: state.gender } : {}),
    ...(Number.isNaN(ageMin) ? {} : { age_min: ageMin }),
    ...(Number.isNaN(ageMax) ? {} : { age_max: ageMax }),
    ...(state.status ? { status: state.status } : {}),
    ...(state.hasImages === ''
      ? {}
      : { has_images: state.hasImages === 'true' }),
    sort_by: state.sortBy,
    sort_order: state.sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

export function generatePatientIdentifier(
  now: Date,
  randomValue: number
): string {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const suffix = Math.floor(Math.max(0, Math.min(randomValue, 0.999999)) * 9999)
    .toString()
    .padStart(4, '0');
  return `P${date}${suffix}`;
}
