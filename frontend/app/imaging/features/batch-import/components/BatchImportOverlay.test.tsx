import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, jest } from '@jest/globals';

jest.mock('@/app/upload/_components/patient-search-select', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (patientId: string) => void }) => (
    <button type="button" onClick={() => onChange('3')}>
      选择患者
    </button>
  ),
}));

jest.mock('@/components/common/TeamMultiSelect', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (teamIds: number[]) => void }) => (
    <button type="button" onClick={() => onChange([11, 12])}>
      选择团队
    </button>
  ),
}));

import BatchImportOverlay from './BatchImportOverlay';

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

function renderOverlay(overrides = {}) {
  const props = {
    files,
    patientId: '',
    examType: '正位X光片',
    examTypes: ['正位X光片', '侧位X光片'],
    ownershipScope: 'personal' as const,
    teamIds: [],
    lrFlip: false,
    isUploading: false,
    message: '',
    loadTeams: jest.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })),
    onPatientChange: jest.fn(),
    onExamTypeChange: jest.fn(),
    onOwnershipScopeChange: jest.fn(),
    onTeamIdsChange: jest.fn(),
    onToggleFlip: jest.fn(),
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
