import { apiSdk } from '@/infrastructure/http';
import type { DeletePatientResult, Patient } from './types';

export async function getPatientDetail(
  patientId: number | string
): Promise<Patient> {
  return apiSdk.patients.get(Number(patientId));
}

export async function deletePatient(
  patientId: number | string
): Promise<DeletePatientResult> {
  return apiSdk.patients.delete(Number(patientId));
}
