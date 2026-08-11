export interface DashboardPatientSource {
  id: number;
  name: string;
  patient_id?: string | null;
}

export interface DashboardImageSource {
  id: number;
  patient_id?: number | null;
  description?: string | null;
  created_at: string;
  status?: string | null;
}

export interface DashboardPendingTask {
  id: number;
  patient_name: string;
  patient_id: string;
  study_type: string;
  created_at: string;
  priority: 'high' | 'normal';
  status: string;
}

export function resolveTaskPriority(
  status: string | undefined | null
): DashboardPendingTask['priority'] {
  const normalized = status?.toUpperCase().trim();
  return normalized === 'UPLOADED' || normalized === 'PENDING'
    ? 'high'
    : 'normal';
}

export function buildDashboardPendingTask(
  image: DashboardImageSource,
  patient?: DashboardPatientSource
): DashboardPendingTask | null {
  const patientName = patient?.name.trim();
  if (!patient || !patientName) return null;
  return {
    id: image.id,
    patient_name: patientName,
    patient_id: patient.patient_id?.trim() || '未分配编号',
    study_type: image.description?.trim() || '未知类型',
    created_at: image.created_at,
    priority: resolveTaskPriority(image.status),
    status: image.status || 'pending',
  };
}

export function comparePendingTasks(
  left: DashboardPendingTask,
  right: DashboardPendingTask
): number {
  if (left.priority !== right.priority) {
    return left.priority === 'high' ? -1 : 1;
  }
  return (
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

export function buildDashboardPendingTasks(input: {
  patients: readonly DashboardPatientSource[];
  imageFiles: readonly DashboardImageSource[];
}): DashboardPendingTask[] {
  const patientsById = new Map(input.patients.map(patient => [patient.id, patient]));
  return input.imageFiles
    .map(image =>
      buildDashboardPendingTask(image, patientsById.get(image.patient_id ?? -1))
    )
    .filter((task): task is DashboardPendingTask => task !== null)
    .sort(comparePendingTasks);
}
