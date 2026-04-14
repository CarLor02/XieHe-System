export interface SyncServiceConfig {
  serviceUrl: string;
  apiKey?: string;
}

export interface SyncScanFile {
  id: number;
  month_folder: string;
  patient_folder: string;
  filename: string;
  file_path: string;
  file_size: number;
  is_primary: boolean;
  is_valid: boolean;
  is_synced: boolean;
  synced_at: string | null;
}

export interface SyncStatsResponse {
  total_files?: number;
  valid_files?: number;
  primary_files?: number;
  synced_files?: number;
  unsynced_primary?: number;
}
