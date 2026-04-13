export interface DashboardStats {
  total_patients: number;
  new_patients_today: number;
  new_patients_week: number;
  active_patients: number;
  total_images: number;
  images_today: number;
  images_week: number;
  pending_images: number;
  processed_images: number;
  completion_rate: number;
  average_processing_time: number;
  system_alerts: number;
  generated_at?: string;
}

export interface DashboardTask {
  task_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  due_date?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  progress: number;
  tags: string[];
  estimated_hours?: number;
  actual_hours?: number;
}

export interface DashboardOverview {
  stats: DashboardStats;
  tasks?: DashboardTask[];
  recent_activities?: DashboardActivity[];
}

export interface DashboardActivity {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  type?: string;
}

export interface DashboardSystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: {
    incoming: number;
    outgoing: number;
  };
  database_connections: number;
  active_sessions: number;
  api_response_time: number;
  error_rate: number;
  uptime: string;
}
