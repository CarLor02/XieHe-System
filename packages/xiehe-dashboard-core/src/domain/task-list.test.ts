import { describe, expect, it } from 'vitest';

import { paginateDashboardTasks } from './task-list';

const tasks = [
  { id: 1, created_at: '2026-08-11T03:00:00', priority: 'high' },
  { id: 2, created_at: '2026-08-10T03:00:00', priority: 'normal' },
  { id: 3, created_at: '2026-08-11T04:00:00', priority: 'normal' },
];

describe('paginateDashboardTasks', () => {
  it('filters by the caller supplied local day and returns stable pagination', () => {
    const result = paginateDashboardTasks({
      tasks,
      filter: 'today',
      requestedPage: 4,
      pageSize: 1,
      now: new Date('2026-08-11T12:00:00'),
    });
    expect(result.filteredTasks.map(task => task.id)).toEqual([1, 3]);
    expect(result.currentPage).toBe(2);
    expect(result.displayedTasks.map(task => task.id)).toEqual([3]);
    expect(result.highPriorityCount).toBe(1);
  });

  it('keeps empty lists on page one', () => {
    expect(
      paginateDashboardTasks({
        tasks: [],
        filter: 'all',
        requestedPage: 3,
        pageSize: 5,
        now: new Date(),
      })
    ).toMatchObject({ totalPages: 1, currentPage: 1, startIndex: 0 });
  });
});
