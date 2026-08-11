import { apiSdk } from '@/infrastructure/http';
import type { Patient, PatientUpdateRequest } from './types';

export async function updatePatient(
  patientId: number | string,
  payload: PatientUpdateRequest
): Promise<Patient> {
  return apiSdk.patients.update(Number(patientId), payload);
}
