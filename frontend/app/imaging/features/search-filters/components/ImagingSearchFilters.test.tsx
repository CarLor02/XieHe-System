import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, jest } from '@jest/globals';
import type { ComponentProps } from 'react';

import ImagingSearchFilters from './ImagingSearchFilters';

jest.mock('@/components/common/EntitySearchSelect', () => ({
  __esModule: true,
  default: () => <div data-testid="entity-search-select" />,
}));

jest.mock('@/components/common/TeamMultiSelect', () => ({
  __esModule: true,
  default: () => <div data-testid="team-multi-select" />,
}));

function renderFilters(
  overrides: Partial<ComponentProps<typeof ImagingSearchFilters>> = {}
) {
  const props: ComponentProps<typeof ImagingSearchFilters> = {
    searchTerm: '',
    showFilters: false,
    selectedExamType: 'all',
    selectedProcessingStatus: 'all',
    dateFrom: '',
    dateTo: '',
    viewMode: 'grid',
    canUseUploaderView: false,
    canUseTeamView: false,
    selectedUploader: null,
    selectedTeamIds: [],
    visibleCount: 2,
    total: 2,
    exportContent: 'original-image',
    exportContentOptions: [{ value: 'original-image', label: '原图影像' }],
    activeBatchMode: null,
    selectedBatchCount: 0,
    isExporting: false,
    exportProgress: 0,
    exportMessage: '',
    batchExamType: '',
    isSettingBatchExamType: false,
    batchExamTypeMessage: '',
    isBatchOperationBusy: false,
    onChangeSearchTerm: jest.fn(),
    onSearch: jest.fn(),
    onToggleFilters: jest.fn(),
    onChangeExamType: jest.fn(),
    onChangeProcessingStatus: jest.fn(),
    onChangeDateFrom: jest.fn(),
    onChangeDateTo: jest.fn(),
    onChangeViewMode: jest.fn(),
    onChangeUploader: jest.fn(),
    onChangeTeams: jest.fn(),
    onLoadUploaders: jest.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })),
    onLoadTeams: jest.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })),
    onClearFilters: jest.fn(),
    onSelectBatchOperation: jest.fn(),
    onExitBatchMode: jest.fn(),
    onChangeExportContent: jest.fn(),
    onClearBatchSelection: jest.fn(),
    onStartBatchExport: jest.fn(),
    onChangeBatchExamType: jest.fn(),
    onRequestBatchExamTypeUpdate: jest.fn(),
    ...overrides,
  };

  return {
    ...render(<ImagingSearchFilters {...props} />),
    props,
  };
}

it('opens batch export controls from the imaging center toolbar', async () => {
  const onSelectBatchOperation = jest.fn();
  renderFilters({ onSelectBatchOperation });

  await userEvent.click(screen.getByRole('button', { name: '批量操作' }));
  await userEvent.click(screen.getByRole('button', { name: '批量导出' }));

  expect(onSelectBatchOperation).toHaveBeenCalledWith('export');
});

it('opens batch import file selection from the imaging center toolbar', async () => {
  const onSelectBatchOperation = jest.fn();
  renderFilters({ onSelectBatchOperation });

  await userEvent.click(screen.getByRole('button', { name: '批量操作' }));
  await userEvent.click(screen.getByRole('button', { name: '批量导入' }));

  expect(onSelectBatchOperation).toHaveBeenCalledWith('import');
});

it('disables switching batch operations while an operation is running', () => {
  renderFilters({ isBatchOperationBusy: true });

  expect(
    screen.getByRole('button', { name: '批量操作' }).hasAttribute('disabled')
  ).toBe(true);
});

it('shows export content selection and export action in batch export mode', () => {
  renderFilters({
    activeBatchMode: 'export',
    selectedBatchCount: 2,
    exportContentOptions: [
      { value: 'original-image', label: '原图影像' },
      { value: 'measurement-parameters', label: '参数测量' },
    ],
  });

  expect(screen.getByText('导出内容')).toBeTruthy();
  expect(screen.getByRole('combobox')).toBeTruthy();
  expect(screen.getByRole('button', { name: /进行导出/ })).toBeTruthy();
  expect(screen.getByText('已选 2 张影像')).toBeTruthy();
});

it('shows exam type selection and setting actions in batch setting mode', () => {
  renderFilters({
    activeBatchMode: 'set-exam-type',
    selectedBatchCount: 3,
    batchExamType: '侧位X光片',
  });

  expect(screen.getByText('类型设置为')).toBeTruthy();
  expect(screen.getByDisplayValue('侧位X光片')).toBeTruthy();
  expect(screen.getByRole('button', { name: '退出设置' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '进行设置' })).toBeTruthy();
  expect(screen.getByText('已选 3 张影像')).toBeTruthy();
});
