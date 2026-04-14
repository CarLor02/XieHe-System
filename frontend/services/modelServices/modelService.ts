import { apiClient } from '@/lib/api';
import { extractData, extractPaginatedData } from '@/lib/api/types';
import {
  CreateModelRequest,
  DeleteModelResult,
  ModelConfiguration,
  ModelItem,
  ModelListResult,
  ModelStats,
} from './types';

export async function getModels(params: {
  page?: number;
  page_size?: number;
  view_type?: string;
  search?: string;
} = {}): Promise<ModelListResult> {
  const response = await apiClient.get('/api/v1/models/', { params });
  return extractPaginatedData<ModelItem>(response);
}

export async function getModelStats(): Promise<ModelStats> {
  const response = await apiClient.get('/api/v1/models/stats');
  return extractData<ModelStats>(response);
}

export async function createModel(
  payload: CreateModelRequest
): Promise<ModelItem> {
  const response = await apiClient.post('/api/v1/models/', payload);
  return extractData<ModelItem>(response);
}

export async function activateModel(modelId: string): Promise<void> {
  await apiClient.post(`/api/v1/models/${modelId}/activate`);
}

export async function deleteModel(modelId: string): Promise<DeleteModelResult> {
  const response = await apiClient.delete(`/api/v1/models/${modelId}`);
  return extractData<DeleteModelResult>(response);
}

export async function getModelConfiguration(): Promise<ModelConfiguration> {
  const response = await apiClient.get('/api/v1/models/configuration');
  return extractData<ModelConfiguration>(response);
}

export async function updateModelConfiguration(
  payload: ModelConfiguration
): Promise<ModelConfiguration> {
  const response = await apiClient.put('/api/v1/models/configuration', payload);
  return extractData<ModelConfiguration>(response);
}
