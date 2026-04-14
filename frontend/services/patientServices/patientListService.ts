import { apiClient } from '@/lib/api';
import { extractPaginatedData } from '@/lib/api/types';
import { Patient, PatientListFilters, PatientListResult } from './types';

function buildPatientListParams(filters: PatientListFilters): URLSearchParams {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    page_size: String(filters.page_size ?? 20),
  });

  if (filters.search) params.set('search', filters.search);
  if (filters.gender) params.set('gender', filters.gender);
  if (filters.age_min !== undefined) params.set('age_min', String(filters.age_min));
  if (filters.age_max !== undefined) params.set('age_max', String(filters.age_max));
  if (filters.status) params.set('status', filters.status);
  if (filters.has_images !== undefined) {
    params.set('has_images', String(filters.has_images));
  }
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_order) params.set('sort_order', filters.sort_order);

  return params;
}

export async function getPatients(
  filters: PatientListFilters = {}
): Promise<PatientListResult> {
  const params = buildPatientListParams(filters);
  const response = await apiClient.get(`/api/v1/patients/?${params.toString()}`);
  return extractPaginatedData<Patient>(response);
}

export async function getAllPatients(
  filters: Omit<PatientListFilters, 'page' | 'page_size'> = {},
  pageSize = 100
): Promise<Patient[]> {
  const firstPage = await getPatients({
    ...filters,
    page: 1,
    page_size: pageSize,
  });

  const allItems = [...firstPage.items];
  const totalPages = Math.max(firstPage.totalPages, 1);

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await getPatients({
      ...filters,
      page,
      page_size: pageSize,
    });
    allItems.push(...nextPage.items);
  }

  return allItems;
}
