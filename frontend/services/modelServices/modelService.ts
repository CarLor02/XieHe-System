import { apiSdk } from '@/infrastructure/http';
import type {
  CreateModelRequest,
  DeleteModelResult,
  ModelConfiguration,
  ModelListResult,
  ModelStats,
  ModelItem,
} from './types';

export function getModels(
  params: {
    page?: number;
    page_size?: number;
    view_type?: string;
    search?: string;
  } = {}
): Promise<ModelListResult> {
  return apiSdk.models.list(params);
}

export function getModelStats(): Promise<ModelStats> {
  return apiSdk.models.getStats();
}

export function createModel(payload: CreateModelRequest): Promise<ModelItem> {
  return apiSdk.models.create(payload);
}

export async function activateModel(modelId: string): Promise<void> {
  await apiSdk.models.activate(modelId);
}

export function deleteModel(modelId: string): Promise<DeleteModelResult> {
  return apiSdk.models.delete(modelId);
}

export function getModelConfiguration(): Promise<ModelConfiguration> {
  return apiSdk.models.getConfiguration();
}

export function updateModelConfiguration(
  payload: ModelConfiguration
): Promise<ModelConfiguration> {
  return apiSdk.models.updateConfiguration(payload);
}
