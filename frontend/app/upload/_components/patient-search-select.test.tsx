import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { Patient } from '@/services/patientServices';

const mockGetPatients = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('@/services/patientServices', () => ({
  __esModule: true,
  getPatients: (...args: unknown[]) => mockGetPatients(...args),
}));

const PatientSearchSelect = jest.requireActual<
  typeof import('./patient-search-select')
>('./patient-search-select').default;

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 1,
    patient_id: 'P001',
    name: '李先生',
    gender: '男',
    age: 41,
    phone: '13800138001',
    ...overrides,
  };
}

function makeResult({
  items,
  page = 1,
  totalPages = 1,
}: {
  items: Patient[];
  page?: number;
  totalPages?: number;
}) {
  return {
    items,
    total: items.length,
    page,
    pageSize: 10,
    totalPages,
  };
}

describe('PatientSearchSelect', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockGetPatients.mockReset();
  });

  it('loads the first 10 patients when opened and selects a patient with full details', async () => {
    mockGetPatients.mockResolvedValue(
      makeResult({ items: [makePatient()] })
    );
    const onChange = jest.fn<(patientId: string) => void>();

    render(<PatientSearchSelect value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /请选择患者/ }));

    await waitFor(() => {
      expect(mockGetPatients).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
      });
    });

    expect(screen.getByText('李先生')).not.toBeNull();
    expect(screen.getByText(/13800138001/)).not.toBeNull();
    expect(screen.getByText('男')).not.toBeNull();
    expect(screen.getByText('41岁')).not.toBeNull();

    fireEvent.click(screen.getByRole('option', { name: /李先生/ }));

    expect(onChange).toHaveBeenCalledWith('1');
    expect(screen.getByRole('button', { name: /李先生/ })).not.toBeNull();
  });

  it('left aligns the patient name and phone inside each option', async () => {
    mockGetPatients.mockResolvedValue(
      makeResult({ items: [makePatient({ name: 'testweb', phone: '13434343222' })] })
    );

    render(<PatientSearchSelect value="" onChange={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /请选择患者/ }));

    const option = await screen.findByRole('option', { name: /testweb/ });
    const primaryInfo = option.querySelector('[data-testid="patient-option-primary"]');
    const name = option.querySelector('[data-testid="patient-option-name"]');
    const phone = option.querySelector('[data-testid="patient-option-phone"]');

    expect(primaryInfo?.className).toContain('items-start');
    expect(primaryInfo?.className).toContain('text-left');
    expect(name?.className).toContain('text-left');
    expect(phone?.className).toContain('text-left');
  });

  it('debounces searchKey input and searches by name or phone', async () => {
    jest.useFakeTimers();
    mockGetPatients.mockResolvedValue(
      makeResult({ items: [makePatient({ id: 2, name: '王女士' })] })
    );

    render(<PatientSearchSelect value="" onChange={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /请选择患者/ }));
    await waitFor(() => expect(mockGetPatients).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('搜索患者姓名或手机号'), {
      target: { value: '王女士' },
    });

    expect(mockGetPatients).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockGetPatients).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 10,
        search: '王女士',
      });
    });
  });

  it('uses server pagination with 10 patients per page', async () => {
    mockGetPatients
      .mockResolvedValueOnce(
        makeResult({
          items: [makePatient({ id: 1, name: '第一页患者' })],
          page: 1,
          totalPages: 2,
        })
      )
      .mockResolvedValueOnce(
        makeResult({
          items: [makePatient({ id: 2, name: '第二页患者' })],
          page: 2,
          totalPages: 2,
        })
      );

    render(<PatientSearchSelect value="" onChange={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /请选择患者/ }));

    await waitFor(() => {
      expect(screen.getByText('第 1 / 2 页')).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: '下一页' }));

    await waitFor(() => {
      expect(mockGetPatients).toHaveBeenLastCalledWith({
        page: 2,
        page_size: 10,
      });
    });
    expect(screen.getByText('第二页患者')).not.toBeNull();
  });
});
