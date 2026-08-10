import { apiClient } from '@/infrastructure/http';
import { Patient, PatientUpdateRequest } from './types';

export async function updatePatient(
  patientId: number | string,
  payload: PatientUpdateRequest
): Promise<Patient> {
  return apiClient.put<Patient, PatientUpdateRequest>(
    `/api/v1/patients/${patientId}`,
    payload
  );
}
