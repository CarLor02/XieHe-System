import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';
import type { Patient } from '@/services/patientServices';

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

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 1,
    patient_id: 'P2025001',
    name: '张三',
    gender: '男',
    age: 41,
    phone: '13800138001',
    email: 'zhangsan@example.com',
    status: 'active',
    created_at: '2026-06-11T00:00:00Z',
    ...overrides,
  };
}

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

it('renders patient cards on narrow screens instead of forcing table scrolling', async () => {
  mockGetPatients.mockResolvedValue({
    items: [makePatient()],
    total: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });

  const { container } = render(<PatientsPage />);

  await waitFor(() => {
    expect(mockGetPatients).toHaveBeenCalled();
  });
  expect(screen.getAllByText('张三').length).toBeGreaterThan(0);

  const mobileList = container.querySelector('[data-testid="patients-mobile-list"]');
  expect(mobileList?.className).toContain('md:hidden');

  const desktopTable = container.querySelector('[data-testid="patients-desktop-table"]');
  expect(desktopTable?.className).toContain('hidden');
  expect(desktopTable?.className).toContain('md:block');
  expect(desktopTable?.className).toContain('overflow-x-auto');
});
