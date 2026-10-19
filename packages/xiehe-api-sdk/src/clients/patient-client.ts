import type { HttpApi } from '@stellarmesh/sdk';
import { toPaginatedResult } from '@xiehe/api-client/contracts';
import type {
  PatientCreate,
  RequestUpdatePatient,
  RequestGetPatients,
} from '@xiehe/api-contracts/generated';
import { createPatientApi } from '../api/patientApi';

export function createPatientClient(http: HttpApi) {
  const patientApi = createPatientApi(http);
  async function list(query: Partial<RequestGetPatients> = {}) {
    return toPaginatedResult(
      await patientApi.requestGetPatients({
        page: 1,
        page_size: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
        ...query,
      })
    );
  }
  return {
    list,
    async listAll(
      query: Omit<Partial<RequestGetPatients>, 'page' | 'page_size'> = {},
      pageSize = 100
    ) {
      const first = await list({ ...query, page: 1, page_size: pageSize });
      const items = [...first.items];
      for (let page = 2; page <= first.totalPages; page += 1) {
        items.push(
          ...(await list({ ...query, page, page_size: pageSize })).items
        );
      }
      return items;
    },
    get: (patient_id: number) => patientApi.requestGetPatient({ patient_id }),
    create: (request: PatientCreate) =>
      patientApi.requestCreatePatient(request),
    update: (
      patient_id: number,
      changes: Omit<RequestUpdatePatient, 'patient_id'>
    ) => patientApi.requestUpdatePatient({ ...changes, patient_id }),
    delete: (patient_id: number) =>
      patientApi.requestDeletePatient({ patient_id }),
  };
}
