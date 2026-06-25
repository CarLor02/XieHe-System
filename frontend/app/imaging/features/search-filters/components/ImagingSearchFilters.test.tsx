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
    selectedReviewStatus: 'all',
    dateFrom: '',
    dateTo: '',
    viewMode: 'grid',
    canUseUploaderView: false,
    canUseTeamView: false,
    selectedUploader: null,
    selectedTeamIds: [],
    teamOptions: [],
    visibleCount: 2,
    total: 2,
    exportContent: 'original-image',
    exportContentOptions: [{ value: 'original-image', label: '原图影像' }],
    isBatchExportMode: false,
    selectedExportCount: 0,
    isExporting: false,
    exportProgress: 0,
    exportMessage: '',
    onChangeSearchTerm: jest.fn(),
    onSearch: jest.fn(),
    onToggleFilters: jest.fn(),
    onChangeExamType: jest.fn(),
    onChangeReviewStatus: jest.fn(),
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
    onClearFilters: jest.fn(),
    onToggleBatchExportMode: jest.fn(),
    onExitBatchExportMode: jest.fn(),
    onChangeExportContent: jest.fn(),
    onClearExportSelection: jest.fn(),
    onStartBatchExport: jest.fn(),
    ...overrides,
  };

  return {
    ...render(<ImagingSearchFilters {...props} />),
    props,
  };
}

it('opens batch export controls from the imaging center toolbar', async () => {
  const onToggleBatchExportMode = jest.fn();
  renderFilters({ onToggleBatchExportMode });

  await userEvent.click(screen.getByRole('button', { name: /批量导出/ }));

  expect(onToggleBatchExportMode).toHaveBeenCalledTimes(1);
});

it('shows export content selection and export action in batch export mode', () => {
  renderFilters({
    isBatchExportMode: true,
    selectedExportCount: 2,
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
