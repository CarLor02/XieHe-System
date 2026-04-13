import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { Patient, PatientUpdateRequest } from './types';

export async function updatePatient(
  patientId: number | string,
  payload: PatientUpdateRequest
): Promise<Patient> {
  const response = await apiClient.put(`/api/v1/patients/${patientId}`, payload);
  return extractData<Patient>(response);
}
