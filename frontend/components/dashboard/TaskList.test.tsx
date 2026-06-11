import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, jest } from '@jest/globals';

const mockGetDashboardPendingTasks =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('@/services/dashboardServices', () => ({
  getDashboardPendingTasks: (...args: unknown[]) =>
    mockGetDashboardPendingTasks(...args),
}));

const { default: TaskList } = jest.requireActual<typeof import('./TaskList')>(
  './TaskList'
);

beforeEach(() => {
  mockGetDashboardPendingTasks.mockResolvedValue([
    {
      id: 1,
      patient_id: 'P001',
      patient_name: '李先生',
      study_type: '正位X光片',
      priority: 'high',
      created_at: '2026-06-11T08:00:00Z',
    },
  ]);
});

it('uses a wrapping responsive header so task filters stay readable', async () => {
  render(<TaskList />);

  await screen.findByText('全部任务');

  const header = screen.getByText('待处理任务').closest('div');
  expect(header?.className).toContain('flex-col');
  expect(header?.className).toContain('sm:flex-row');

  const filterButton = screen.getByRole('button', { name: '全部任务' });
  expect(filterButton.className).toContain('whitespace-nowrap');

  const controls = filterButton.parentElement?.parentElement;
  expect(controls?.className).toContain('flex-wrap');
});
