import { describe, expect, it } from 'vitest';

import { buildDashboardPendingTasks } from './pending-task';

describe('buildDashboardPendingTasks', () => {
  it('joins sources, removes invalid patients and orders priority then time', () => {
    expect(
      buildDashboardPendingTasks({
        patients: [
          { id: 1, name: '张三', patient_id: 'P1' },
          { id: 2, name: ' ' },
        ],
        imageFiles: [
          {
            id: 10,
            patient_id: 1,
            created_at: '2026-08-11T01:00:00Z',
            status: 'processed',
          },
          {
            id: 11,
            patient_id: 1,
            created_at: '2026-08-10T01:00:00Z',
            status: 'UPLOADED',
          },
          {
            id: 12,
            patient_id: 2,
            created_at: '2026-08-12T01:00:00Z',
          },
        ],
      }).map(task => task.id)
    ).toEqual([11, 10]);
  });
});
