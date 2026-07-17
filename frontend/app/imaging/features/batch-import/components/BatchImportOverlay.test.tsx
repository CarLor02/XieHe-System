import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, jest } from '@jest/globals';
import type { Patient } from '@/services/patientServices';

const mockGetPatients = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('@/services/patientServices', () => ({
  __esModule: true,
  getPatients: (...args: unknown[]) => mockGetPatients(...args),
}));

jest.mock('@/components/common/TeamMultiSelect', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (teamIds: number[]) => void }) => (
    <button type="button" onClick={() => onChange([11, 12])}>
      选择团队
    </button>
  ),
}));

const BatchImportOverlay = jest.requireActual<
  typeof import('./BatchImportOverlay')
>('./BatchImportOverlay').default;

const files = [
  {
    id: 'file-1',
    name: 'ap-001.png',
    size: 1024,
    type: 'image/png',
    uploadStatus: 'pending' as const,
    aiStatus: 'pending' as const,
  },
  {
    id: 'file-2',
    name: 'ap-002.jpg',
    size: 2048,
    type: 'image/jpeg',
    uploadStatus: 'pending' as const,
    aiStatus: 'pending' as const,
  },
];

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 3,
    patient_id: 'P003',
    name: '王丽',
    gender: '女',
    age: 35,
    phone: '13800138003',
    ...overrides,
  };
}

beforeEach(() => {
  mockGetPatients.mockReset();
});

function renderOverlay(overrides = {}) {
  const props = {
    activeTab: 'new-import' as const,
    files,
    patientId: '',
    examType: '正位X光片',
    examTypes: ['正位X光片', '侧位X光片'],
    ownershipScope: 'personal' as const,
    teamIds: [],
    lrFlip: false,
    isUploading: false,
    message: '',
    maxFiles: 200,
    batches: [],
    batchPage: 1,
    batchTotalPages: 1,
    selectedBatchId: null,
    taskItems: [],
    itemPage: 1,
    itemTotalPages: 1,
    tasksLoading: false,
    loadTeams: jest.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })),
    onPatientChange: jest.fn(),
    onTabChange: jest.fn(),
    onFileInput: jest.fn(),
    onExamTypeChange: jest.fn(),
    onOwnershipScopeChange: jest.fn(),
    onTeamIdsChange: jest.fn(),
    onToggleFlip: jest.fn(),
    onSelectBatch: jest.fn(),
    onChangeBatchPage: jest.fn(),
    onChangeItemPage: jest.fn(),
    onRetryTaskItem: jest.fn(),
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };

  return {
    ...render(<BatchImportOverlay {...props} />),
    props,
  };
}

it('renders batch file names and shared import options without crop controls', async () => {
  const { props } = renderOverlay();

  expect(screen.getByText('批量导入影像')).toBeTruthy();
  expect(screen.getByText('ap-001.png')).toBeTruthy();
  expect(screen.getByText('ap-002.jpg')).toBeTruthy();
  expect(screen.getByText('请选择患者')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /裁剪影像/ })).not.toBeTruthy();

  await userEvent.selectOptions(screen.getByLabelText(/影像类型/), '侧位X光片');
  await userEvent.click(screen.getByRole('button', { name: /左右翻转/ }));
  await userEvent.click(screen.getByRole('button', { name: /开始导入/ }));

  expect(props.onExamTypeChange).toHaveBeenCalledWith('侧位X光片');
  expect(props.onToggleFlip).toHaveBeenCalledTimes(1);
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
});

it('renders the patient list above the batch import overlay layer', async () => {
  const user = userEvent.setup();
  mockGetPatients.mockResolvedValue({
    items: [makePatient()],
    total: 1,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });
  renderOverlay();

  await user.click(screen.getByRole('button', { name: /请选择患者/ }));

  const listbox = await screen.findByRole('listbox');
  const dropdownContent = listbox.closest('[data-side]');

  expect(dropdownContent?.className).toContain('z-[10001]');
});
