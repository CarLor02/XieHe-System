import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { Patient, PatientCreateRequest } from './types';

export async function createPatient(
  payload: PatientCreateRequest
): Promise<Patient> {
  const response = await apiClient.post('/api/v1/patients/', payload);
  return extractData<Patient>(response);
}
