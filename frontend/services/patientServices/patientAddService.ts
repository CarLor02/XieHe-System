import { apiClient } from '@/infrastructure/http';
import { Patient, PatientCreateRequest } from './types';

export async function createPatient(
  payload: PatientCreateRequest
): Promise<Patient> {
  return apiClient.post<Patient, PatientCreateRequest>(
    '/api/v1/patients/',
    payload
  );
}
