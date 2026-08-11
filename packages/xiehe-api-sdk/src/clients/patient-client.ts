import type { HttpClient } from '@xiehe/api-client';
import { normalizeLegacyPagination } from '@xiehe/api-client/contracts';
import type {
  DeletePatientResult,
  Patient,
  PatientCreateRequest,
  PatientListQuery,
  PatientUpdateRequest,
} from '@xiehe/api-contracts';
import { compactQuery } from '../shared/query';

export function createPatientClient(client: HttpClient) {
  async function list(query: PatientListQuery = {}) {
    const data = await client.get<unknown>('/api/v1/patients/', {
      params: compactQuery({ page: 1, page_size: 20, ...query }),
    });
    return normalizeLegacyPagination<Patient>(data);
  }

  return {
    list,
    async listAll(
      query: Omit<PatientListQuery, 'page' | 'page_size'> = {},
      pageSize = 100
    ) {
      const first = await list({ ...query, page: 1, page_size: pageSize });
      const items = [...first.items];
      for (let page = 2; page <= Math.max(first.totalPages, 1); page += 1) {
        items.push(
          ...(await list({ ...query, page, page_size: pageSize })).items
        );
      }
      return items;
    },
    get: (patientId: number) =>
      client.get<Patient>(`/api/v1/patients/${patientId}`),
    create: (request: PatientCreateRequest) =>
      client.post<Patient, PatientCreateRequest>('/api/v1/patients/', request),
    update: (patientId: number, request: PatientUpdateRequest) =>
      client.put<Patient, PatientUpdateRequest>(
        `/api/v1/patients/${patientId}`,
        request
      ),
    delete: (patientId: number) =>
      client.delete<DeletePatientResult>(`/api/v1/patients/${patientId}`),
  };
}
