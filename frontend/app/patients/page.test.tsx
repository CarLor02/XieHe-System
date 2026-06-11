import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

const pushMock = jest.fn();
const mockGetPatients = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock('@/lib/api', () => ({
  useUser: () => ({
    isAuthenticated: true,
  }),
}));

jest.mock('@/components/layout/AppShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/Tooltip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactElement }) => children,
}));

jest.mock('@/services/patientServices', () => ({
  getPatients: (...args: unknown[]) => mockGetPatients(...args),
}));

const { default: PatientsPage } = jest.requireActual<typeof import('./page')>(
  './page'
);

it('uses responsive patient search controls on narrow screens', async () => {
  mockGetPatients.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });

  render(<PatientsPage />);

  await waitFor(() => {
    expect(mockGetPatients).toHaveBeenCalled();
  });

  const searchButton = screen.getByRole('button', { name: '搜索' });
  const searchRow = searchButton.closest('div');
  expect(searchRow?.className).toContain('flex-col');
  expect(searchRow?.className).toContain('lg:flex-row');
  expect(searchButton.className).toContain('sm:w-auto');

  const moreOptionsButton = screen.getByRole('button', { name: /更多选项/ });
  expect(moreOptionsButton.className).toContain('sm:w-auto');
});
