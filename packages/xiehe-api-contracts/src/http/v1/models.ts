import type { PaginatedResult } from '@xiehe/api-client/contracts';

export interface ModelItem {
  id: string;
  name: string;
  description?: string | null;
  view_type: string;
  endpoint_url: string;
  version?: string | null;
  status?: string | null;
  is_active: boolean;
  is_system_default?: boolean;
  can_delete?: boolean;
  updated_at?: string;
  tags?: string[];
}

export interface ModelStats {
  total_models: number;
  active_models: number;
  view_distribution: Record<string, number>;
}

export interface ModelConfiguration {
  front_model_id?: string | null;
  side_model_id?: string | null;
}

export interface CreateModelRequest {
  name: string;
  description?: string;
  view_type: string;
  endpoint_url: string;
  version?: string;
  tags?: string[];
}

export interface ModelListQuery {
  page?: number;
  page_size?: number;
  search?: string;
  view_type?: string;
  status?: string;
}

export interface DeleteModelResult {
  success?: boolean;
  fallback_to_default?: boolean;
  active_model_id?: string;
}

export type ModelListResult = PaginatedResult<ModelItem>;
