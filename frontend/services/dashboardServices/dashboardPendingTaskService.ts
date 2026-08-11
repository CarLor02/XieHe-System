import { getAllImageFiles } from '@/services/imageServices';
import { getAllPatients } from '@/services/patientServices';
import {
  buildDashboardPendingTasks,
  type DashboardPendingTask,
} from '@xiehe/dashboard-core';

export async function getDashboardPendingTasks(): Promise<
  DashboardPendingTask[]
> {
  const [patients, imageFiles] = await Promise.all([
    getAllPatients(),
    getAllImageFiles({ file_status: 'UPLOADED' }),
  ]);

  return buildDashboardPendingTasks({ patients, imageFiles });
}
