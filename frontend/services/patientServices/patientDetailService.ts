import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import { DeletePatientResult, Patient } from './types';

export async function getPatientDetail(patientId: number | string): Promise<Patient> {
  const response = await apiClient.get(`/api/v1/patients/${patientId}`);
  return extractData<Patient>(response);
}

export async function deletePatient(
  patientId: number | string
): Promise<DeletePatientResult> {
  const response = await apiClient.delete(`/api/v1/patients/${patientId}`);
  return extractData<DeletePatientResult>(response);
}
