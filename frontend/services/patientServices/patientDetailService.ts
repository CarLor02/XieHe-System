import { apiClient } from '@/infrastructure/http';
import { DeletePatientResult, Patient } from './types';

export async function getPatientDetail(
  patientId: number | string
): Promise<Patient> {
  return apiClient.get<Patient>(`/api/v1/patients/${patientId}`);
}

export async function deletePatient(
  patientId: number | string
): Promise<DeletePatientResult> {
  return apiClient.delete<DeletePatientResult>(`/api/v1/patients/${patientId}`);
}
