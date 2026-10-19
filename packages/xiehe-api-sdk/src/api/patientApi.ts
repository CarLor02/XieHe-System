import type { HttpApi } from '@stellarmesh/sdk';
import type {
  PaginatedData_PatientResponse_,
  PatientCreate,
  PatientResponse,
  RequestDeletePatient,
  RequestGetPatient,
  RequestGetPatients,
  RequestUpdatePatient,
} from '@xiehe/api-contracts/generated';

export function createPatientApi(http: HttpApi) {
  return {
    requestCreatePatient: http.post<PatientCreate, PatientResponse>(
      '/api/v1/patients/create'
    ),
    requestDeletePatient: http.post<RequestDeletePatient, null>(
      '/api/v1/patients/delete'
    ),
    requestGetPatient: http.post<RequestGetPatient, PatientResponse>(
      '/api/v1/patients/get'
    ),
    requestGetPatients: http.post<
      RequestGetPatients,
      PaginatedData_PatientResponse_
    >('/api/v1/patients/list'),
    requestUpdatePatient: http.post<RequestUpdatePatient, PatientResponse>(
      '/api/v1/patients/update'
    ),
  };
}
