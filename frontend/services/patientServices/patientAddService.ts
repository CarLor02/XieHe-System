import { apiSdk } from '@/infrastructure/http';
import type { Patient, PatientCreateRequest } from './types';

export async function createPatient(
  payload: PatientCreateRequest
): Promise<Patient> {
  return apiSdk.patients.create(payload);
}
