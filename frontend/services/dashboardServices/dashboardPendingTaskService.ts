import {
  getAllImageFiles,
  type ImageFile,
} from '@/services/imageServices';
import {
  getAllPatients,
  type Patient,
} from '@/services/patientServices';
import { DashboardPendingTask } from './types';

function resolveTaskPriority(status: string | undefined): 'high' | 'normal' {
  const normalized = status?.toUpperCase().trim();
  if (normalized === 'UPLOADED' || normalized === 'PENDING') {
    return 'high';
  }
  return 'normal';
}

function comparePendingTasks(
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

export async function getDashboardPendingTasks(): Promise<DashboardPendingTask[]> {
  const [patients, imageFiles] = await Promise.all([
    getAllPatients(),
    getAllImageFiles({ status: 'pending' }),
  ]);

  const patientsById = new Map<number, Patient>(
    patients.map(
      (patient:Patient) => [patient.id, patient]
    )
  );

  return imageFiles
    .map(
        (image:ImageFile) => buildDashboardPendingTask(image, patientsById.get(image.patient_id ?? -1))
    )
    .filter(
        (task): task is DashboardPendingTask => task !== null
    )
    .sort(comparePendingTasks);
}

function buildDashboardPendingTask(
  image: ImageFile,
  patient?: Patient
): DashboardPendingTask | null {
  if (!patient) {
    return null;
  }

  const patientName = patient.name.trim();
  if (!patientName) {
    return null;
  }

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
