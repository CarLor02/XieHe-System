import type { PaginatedResult } from '@xiehe/api-client/contracts';
import type {
  PatientResponse,
  PatientCreate,
  RequestUpdatePatient,
  RequestGetPatients,
} from '../../generated';

export type Patient = Pick<
  PatientResponse,
  'id' | 'patient_id' | 'name' | 'gender'
> &
  Partial<Omit<PatientResponse, 'id' | 'patient_id' | 'name' | 'gender'>>;
export type PatientCreateRequest = PatientCreate;
export type PatientUpdateRequest = Omit<RequestUpdatePatient, 'patient_id'>;
export type PatientListQuery = Partial<RequestGetPatients>;
export type PatientListResult = PaginatedResult<Patient>;
export type DeletePatientResult = null;
