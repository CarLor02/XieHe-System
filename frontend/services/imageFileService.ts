/**
 * 影像文件管理API服务
 * 
 * 提供影像文件的查询、下载、删除等功能
 * 基于新的 image_files 表
 */

import { createAuthenticatedClient } from '@/store/authStore';

export interface ImageFile {
  id: number;
  file_uuid: string;
  original_filename: string;
  file_type: 'DICOM' | 'JPEG' | 'PNG' | 'TIFF' | 'OTHER';
  mime_type?: string;
  file_size: number;
  storage_path: string;
  thumbnail_path?: string;
  uploaded_by: number;
  uploader_name?: string;
  patient_id?: number;
  study_id?: number;
  modality?: string;
  body_part?: string;
  study_date?: string;
  description?: string;
  status: 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'ARCHIVED' | 'DELETED';
  upload_progress: number;
  created_at: string;
  uploaded_at?: string;
}

export interface ImageFileListResponse {
  total: number;
  page: number;
  page_size: number;
  items: ImageFile[];
}

export interface ImageFileStats {
  total_files: number;
  total_size: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_modality: Record<string, number>;
}

export interface ImageFileFilters {
  page?: number;
  page_size?: number;
  description?: string; // 检查类型筛选
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  review_status?: 'reviewed' | 'unreviewed'; // 审核状态筛选
}

/**
 * 获取影像文件列表
 *
 * 权限控制：
 * - 超级管理员：看所有影像
 * - 团队负责人(ADMIN)：看团队所有成员上传的影像
 * - 普通用户：只看自己上传的影像
 *
 * 支持筛选：
 * - status: 'pending' (待处理)
 * - review_status: 'reviewed' (已审核) / 'unreviewed' (未审核)
 * - description: 检查类型
 * - search: 搜索关键词
 * - start_date / end_date: 日期范围
 */
export async function getImageFiles(filters: ImageFileFilters = {}): Promise<ImageFileListResponse> {
  const client = createAuthenticatedClient();

  const params: any = {
    page: filters.page || 1,
    page_size: filters.page_size || 20,
  };

  if (filters.description) params.description = filters.description;
  if (filters.status) params.status = filters.status;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.search) params.search = filters.search;
  if (filters.review_status) params.review_status = filters.review_status;

  const response = await client.get('/api/v1/image-files', { params });
  return response.data;
}

/**
 * 获取患者的影像文件列表
 */
export async function getPatientImages(patientId: number, page = 1, pageSize = 20): Promise<ImageFileListResponse> {
  const client = createAuthenticatedClient();
  const response = await client.get(`/api/v1/image-files/patient/${patientId}`, {
    params: { page, page_size: pageSize }
  });
  return response.data;
}

/**
 * 获取影像文件详情
 */
export async function getImageFile(fileId: number): Promise<ImageFile> {
  const client = createAuthenticatedClient();
  const response = await client.get(`/api/v1/image-files/${fileId}`);
  return response.data;
}

/**
 * 下载影像文件
 */
export async function downloadImageFile(fileId: number): Promise<Blob> {
  const client = createAuthenticatedClient();
  const response = await client.get(`/api/v1/image-files/${fileId}/download`, {
    responseType: 'blob'
  });
  return response.data;
}

/**
 * 删除影像文件（软删除）
 */
export async function deleteImageFile(fileId: number): Promise<{ message: string; file_id: number }> {
  const client = createAuthenticatedClient();
  const response = await client.delete(`/api/v1/image-files/${fileId}`);
  return response.data;
}

/**
 * 获取影像统计信息
 */
export async function getImageStats(): Promise<ImageFileStats> {
  const client = createAuthenticatedClient();
  const response = await client.get('/api/v1/image-files/stats/summary');
  return response.data;
}

/**
 * 获取影像文件的预览URL（带认证）
 * 注意：此函数返回一个Promise，需要await使用
 */
export async function getImagePreviewUrl(fileId: number): Promise<string> {
  try {
    const blob = await downloadImageFile(fileId);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to load image:', error);
    // 返回一个占位图片
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7ml6Dlh7rliqDovb08L3RleHQ+PC9zdmc+';
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
