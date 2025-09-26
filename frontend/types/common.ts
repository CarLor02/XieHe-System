/**
 * 医疗影像诊断系统 - 通用类型定义
 * 
 * 定义项目中通用的基础类型
 * 
 * @author 医疗影像团队
 * @version 1.0.0
 */

/**
 * 通用 ID 类型
 */
export type ID = string | number;

/**
 * 时间戳类型
 */
export type Timestamp = string | Date;

/**
 * 通用状态枚举
 */
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELETED = 'deleted',
}

/**
 * 排序方向
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 性别枚举
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  UNKNOWN = 'unknown',
}

/**
 * 优先级枚举
 */
export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * 通用过滤选项
 */
export interface FilterOptions {
  search?: string;
  status?: Status;
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
  sortBy?: string;
  sortOrder?: SortOrder;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * 基础实体接口
 */
export interface BaseEntity {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: ID;
  updatedBy?: ID;
}

/**
 * 软删除实体接口
 */
export interface SoftDeleteEntity extends BaseEntity {
  deletedAt?: Timestamp;
  deletedBy?: ID;
  isDeleted: boolean;
}

/**
 * 地址信息
 */
export interface Address {
  country?: string;
  province: string;
  city: string;
  district?: string;
  street?: string;
  postalCode?: string;
  fullAddress?: string;
}

/**
 * 联系信息
 */
export interface ContactInfo {
  phone?: string;
  mobile?: string;
  email?: string;
  fax?: string;
  website?: string;
}

/**
 * 文件信息
 */
export interface FileInfo {
  id: ID;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Timestamp;
  uploadedBy: ID;
}

/**
 * 标签信息
 */
export interface Tag {
  id: ID;
  name: string;
  color?: string;
  description?: string;
}

/**
 * 注释信息
 */
export interface Comment {
  id: ID;
  content: string;
  author: ID;
  authorName: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  parentId?: ID;
  replies?: Comment[];
}

/**
 * 审计日志
 */
export interface AuditLog {
  id: ID;
  entityType: string;
  entityId: ID;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId: ID;
  userName: string;
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 系统配置
 */
export interface SystemConfig {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  category?: string;
  isPublic: boolean;
}

/**
 * 通知信息
 */
export interface Notification {
  id: ID;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  userId: ID;
  createdAt: Timestamp;
  readAt?: Timestamp;
  data?: Record<string, any>;
}

/**
 * 统计数据
 */
export interface Statistics {
  label: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'stable';
  unit?: string;
  description?: string;
}

/**
 * 图表数据点
 */
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

/**
 * 图表数据集
 */
export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
}

/**
 * 选项接口
 */
export interface Option<T = any> {
  label: string;
  value: T;
  disabled?: boolean;
  description?: string;
  icon?: string;
}

/**
 * 树形节点接口
 */
export interface TreeNode<T = any> {
  id: ID;
  label: string;
  value?: T;
  children?: TreeNode<T>[];
  parent?: TreeNode<T>;
  level?: number;
  expanded?: boolean;
  selected?: boolean;
  disabled?: boolean;
  icon?: string;
}

/**
 * 表格列定义
 */
export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  fixed?: 'left' | 'right';
}

/**
 * 表格行选择配置
 */
export interface TableRowSelection<T = any> {
  type?: 'checkbox' | 'radio';
  selectedRowKeys?: ID[];
  onChange?: (selectedRowKeys: ID[], selectedRows: T[]) => void;
  onSelect?: (record: T, selected: boolean, selectedRows: T[]) => void;
  onSelectAll?: (selected: boolean, selectedRows: T[], changeRows: T[]) => void;
  getCheckboxProps?: (record: T) => { disabled?: boolean };
}

/**
 * 错误信息
 */
export interface ErrorInfo {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Timestamp;
  requestId?: string;
}

/**
 * 成功响应
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: Timestamp;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  success: false;
  error: ErrorInfo;
  timestamp: Timestamp;
}

/**
 * 通用响应类型
 */
export type Response<T = any> = SuccessResponse<T> | ErrorResponse;
