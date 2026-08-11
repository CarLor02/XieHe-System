import { apiSdk } from '@/infrastructure/http';
import type { Patient, PatientListFilters, PatientListResult } from './types';

export async function getPatients(
  filters: PatientListFilters = {}
): Promise<PatientListResult> {
  return apiSdk.patients.list(filters);
}

export async function getAllPatients(
  filters: Omit<PatientListFilters, 'page' | 'page_size'> = {},
  pageSize = 100
): Promise<Patient[]> {
  return apiSdk.patients.listAll(filters, pageSize);
}
