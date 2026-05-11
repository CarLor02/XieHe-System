import { render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

const pushMock = jest.fn();

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

jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header" />,
}));

jest.mock('@/components/Sidebar', () => ({
  __esModule: true,
  default: () => <aside data-testid="sidebar" />,
}));

jest.mock('@/components/patients/BirthDatePicker', () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    required,
  }: {
    value: string;
    onChange: (date: string) => void;
    required?: boolean;
  }) => (
    <input
      aria-label="出生日期"
      name="birth_date"
      required={required}
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  ),
}));

jest.mock('@/services/patientServices', () => ({
  createPatient: jest.fn(),
}));

const AddPatientPage = jest.requireActual<typeof import('./page')>('./page').default;

function getRequiredControlNames(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input[required], select[required], textarea[required]'
    )
  )
    .map(element => element.getAttribute('name'))
    .filter(Boolean)
    .sort();
}

it('marks the backend-required patient creation fields as required', () => {
  const { container } = render(<AddPatientPage />);

  expect(getRequiredControlNames(container)).toEqual([
    'gender',
    'name',
    'patient_id',
  ]);
  expect(container.querySelector('label[for="patient_id"]')?.textContent).toContain('*');
  expect(container.querySelector('label[for="phone"]')?.textContent).not.toContain('*');
  expect(screen.getByText('出生日期').textContent).not.toContain('*');
});
