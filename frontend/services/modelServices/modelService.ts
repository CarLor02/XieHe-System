import { apiClient, normalizeLegacyPagination } from '@/infrastructure/http';
import {
  CreateModelRequest,
  DeleteModelResult,
  ModelConfiguration,
  ModelItem,
  ModelListResult,
  ModelStats,
} from './types';

export async function getModels(
  params: {
    page?: number;
    page_size?: number;
    view_type?: string;
    search?: string;
  } = {}
): Promise<ModelListResult> {
  const data = await apiClient.get<unknown>('/api/v1/models/', { params });
  return normalizeLegacyPagination<ModelItem>(data);
}

export async function getModelStats(): Promise<ModelStats> {
  return apiClient.get<ModelStats>('/api/v1/models/stats');
}

export async function createModel(
  payload: CreateModelRequest
): Promise<ModelItem> {
  return apiClient.post<ModelItem, CreateModelRequest>(
    '/api/v1/models/',
    payload
  );
}

export async function activateModel(modelId: string): Promise<void> {
  await apiClient.post<void>(`/api/v1/models/${modelId}/activate`);
}

export async function deleteModel(modelId: string): Promise<DeleteModelResult> {
  return apiClient.delete<DeleteModelResult>(`/api/v1/models/${modelId}`);
}

export async function getModelConfiguration(): Promise<ModelConfiguration> {
  return apiClient.get<ModelConfiguration>('/api/v1/models/configuration');
}

export async function updateModelConfiguration(
  payload: ModelConfiguration
): Promise<ModelConfiguration> {
  return apiClient.put<ModelConfiguration, ModelConfiguration>(
    '/api/v1/models/configuration',
    payload
  );
}
