import type { PaginatedResult } from '@xiehe/api-client/contracts';
import type {
  AiFrontalKeypointResponse,
  AiLateralKeypointResponse,
  AiMeasurementInput,
  AiMeasurementResponse,
} from '@xiehe/imaging-core/ai';
import type {
  CfhAnnotation,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';

export type ImageAnnotationJson = Record<string, unknown>;
export type ImageFileType = 'DICOM' | 'JPEG' | 'PNG' | 'TIFF' | 'OTHER';
export type ImageFileStatus =
  | 'UPLOADING'
  | 'UPLOADED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'ARCHIVED'
  | 'DELETED';
export type ImageAccessVariant = 'original' | 'thumbnail';

export interface ImageFileSummary {
  id: number;
  file_uuid: string;
  original_filename: string;
  file_type: ImageFileType;
  mime_type?: string;
  file_size: number;
  storage_bucket: string;
  object_key: string;
  storage_etag?: string;
  thumbnail_path?: string;
  uploaded_by: number;
  uploader_name?: string | null;
  patient_id?: number;
  patient_name?: string | null;
  patient_identifier?: string | null;
  patient_gender?: string | null;
  patient_age?: number | null;
  study_id?: number;
  study_date?: string;
  description?: string;
  team_ids?: number[];
  team_names?: string[];
  has_annotation: boolean;
  status: ImageFileStatus;
  upload_progress: number;
  created_at: string;
  uploaded_at?: string;
}

export interface ImageFileDetail extends ImageFileSummary {
  annotation: ImageAnnotationJson | null;
  annotation_version: number;
  annotation_created_at?: string | null;
  annotation_created_by?: number | null;
  annotation_updated_at?: string | null;
  annotation_updated_by?: number | null;
}

export type ImageFile = ImageFileSummary;

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
}

export interface ImageFileDownloadUrl {
  url: string;
  expires_in: number;
  expires_at?: string;
  filename?: string;
  mime_type?: string;
  etag?: string;
  width?: number;
  height?: number;
  file_size?: number;
}

export interface ImageFileDownloadUrlError {
  code: string;
  message: string;
}

export interface ImageFileDownloadUrlsResponse {
  items: Record<number, ImageFileDownloadUrl>;
  errors: Record<number, ImageFileDownloadUrlError>;
}

export interface ImageFileListQuery {
  page?: number;
  page_size?: number;
  file_type?: ImageFileType;
  description?: string;
  file_status?: ImageFileStatus;
  start_date?: string;
  end_date?: string;
  search?: string;
  uploaded_by?: number;
  team_ids?: number[];
}

export interface ImageUploader {
  id: number;
  username: string;
  email?: string | null;
  real_name?: string | null;
  department?: string | null;
  position?: string | null;
  title?: string | null;
  is_system_admin?: boolean;
  system_admin_level?: number;
}

export interface PagedSearchQuery {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface ImageAnnotationBatchItem {
  id: number;
  annotation: ImageAnnotationJson | null;
  annotation_version: number;
}

export interface BatchUpdateImageExamTypeResult {
  updated_ids: number[];
  unchanged_ids: number[];
  updated_count: number;
  unchanged_count: number;
  exam_type: string;
}

export interface AnnotationSaveResult {
  annotation_version: number;
  annotation_updated_at: string | null;
  annotation_updated_by: number | null;
  has_annotation: boolean;
  status: ImageFileStatus;
  changed: boolean;
}

export interface UploadPartUrl {
  part_number: number;
  url: string;
}

export interface UploadSession {
  image_file_id: number;
  file_uuid: string;
  storage_bucket: string;
  object_key: string;
  upload_id: string;
  part_size: number;
  expires_in: number;
  parts: UploadPartUrl[];
}

export interface CreateImageUploadSessionRequest {
  filename: string;
  size: number;
  mime_type: string;
  patient_id?: number | null;
  description?: string | null;
  team_ids?: number[];
}

export interface BatchCreateUploadFile {
  client_file_id: string;
  filename: string;
  size: number;
  mime_type: string;
  file_hash?: string | null;
}

export interface ImageImportConfig {
  max_files: number;
  session_window_size: number;
}

export interface ImageImportItem {
  id: number;
  client_file_id: string;
  filename: string;
  size: number;
  mime_type: string;
  image_file_id?: number | null;
  upload_status:
    | 'PENDING'
    | 'SESSION_CREATED'
    | 'UPLOADING'
    | 'UPLOADED'
    | 'FAILED';
  ai_status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImageImportBatch {
  batch_id: string;
  patient_id: number;
  description?: string | null;
  team_ids: number[];
  status:
    | 'UPLOADING'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'PARTIAL_FAILED'
    | 'FAILED';
  total_items: number;
  uploaded_items: number;
  succeeded_items: number;
  failed_items: number;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface CreatedImageImportBatch extends ImageImportBatch {
  items: ImageImportItem[];
}

export interface ImageImportUploadSession extends UploadSession {
  item_id: number;
  client_file_id: string;
}

export interface CompletedUploadPart {
  part_number: number;
  etag: string;
}

export interface CompleteUploadRequest {
  upload_id: string;
  parts: CompletedUploadPart[];
  file_hash?: string | null;
}

export interface UploadSingleResponse {
  image_file_id: number;
  file_id: string;
  file_uuid: string;
  filename: string;
  size?: number;
  mime_type?: string;
  status?: string;
}

export interface UploadStatusRecord {
  image_file_id?: number;
  file_uuid?: string;
  status?: string;
  upload_progress?: number;
  progress?: number;
  message?: string;
}

export interface UploadRecord {
  id: number | string;
  file_id?: string | number;
  filename?: string;
  status?: string;
  created_at?: string;
}

export interface ImageImportBatchListQuery {
  page?: number;
  page_size?: number;
  status?: string;
}

export type ImageImportBatchListResult = PaginatedResult<ImageImportBatch>;
export type ImageImportItemListResult = PaginatedResult<ImageImportItem>;
export type UploadRecordListResult = PaginatedResult<UploadRecord>;

export interface DetectKeypointsResponse extends AiFrontalKeypointResponse {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
}

export type LateralDetectResponse = AiLateralKeypointResponse;

export interface PredictMeasurementsResponse extends AiMeasurementResponse {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  image_width?: number;
  image_height?: number;
  measurements: AiMeasurementInput[];
  vertebrae?: VertebraAnnotation[];
  cfh?: CfhAnnotation | null;
  raw_keypoints?: unknown;
}

export interface ReportMeasurementItem {
  type: string;
  value: string;
  description?: string | null;
}

export interface GenerateReportRequest {
  imageId: string;
  examType: string;
  measurements: ReportMeasurementItem[];
}

export interface GenerateReportResponse {
  report: string;
}
