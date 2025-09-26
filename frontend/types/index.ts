/**
 * 医疗影像诊断系统 - TypeScript 类型定义
 * 
 * 导出所有类型定义，提供统一的类型导入入口
 * 
 * @author 医疗影像团队
 * @version 1.0.0
 */

// 导出所有类型定义
export * from './api';
export * from './auth';
export * from './patient';
export * from './image';
export * from './diagnosis';
export * from './report';
export * from './user';
export * from './common';

// 重新导出常用的通用类型
export type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  RequestOptions,
} from './api';

export type {
  User,
  UserRole,
  UserPermission,
  LoginCredentials,
  RegisterData,
} from './auth';

export type {
  Patient,
  PatientCreateData,
  PatientUpdateData,
  PatientSearchParams,
} from './patient';

export type {
  MedicalImage,
  ImageUploadData,
  ImageMetadata,
  DicomData,
} from './image';

export type {
  Diagnosis,
  DiagnosisResult,
  AIModelResult,
  DiagnosisCreateData,
} from './diagnosis';

export type {
  Report,
  ReportTemplate,
  ReportCreateData,
  ReportUpdateData,
} from './report';

export type {
  ID,
  Timestamp,
  Status,
  SortOrder,
  FilterOptions,
} from './common';
