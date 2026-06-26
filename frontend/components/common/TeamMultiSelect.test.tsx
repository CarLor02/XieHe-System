import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import TeamMultiSelect, { type TeamMultiSelectPage } from './TeamMultiSelect';
import type { TeamSummary } from '@/services/teamService';

const loadOptions = jest.fn<
  (params: { page: number; pageSize: number; search?: string }) => Promise<TeamMultiSelectPage>
>();

function makeTeam(id: number, name: string): TeamSummary {
  return {
    id,
    name,
    member_count: 1,
    is_member: true,
  };
}

function renderSelect(selectedIds: number[] = [], onChange = jest.fn()) {
  render(
    <TeamMultiSelect
      selectedIds={selectedIds}
      placeholder="选择归属团队"
      searchPlaceholder="搜索团队名"
      loadOptions={loadOptions}
      onChange={onChange}
    />
  );
  return { onChange };
}

describe('TeamMultiSelect', () => {
  beforeEach(() => {
    loadOptions.mockReset();
  });

  it('loads teams by page and keeps selected teams out of pills', async () => {
    const user = userEvent.setup();
    loadOptions
      .mockResolvedValueOnce({
        items: [makeTeam(11, '骨科团队')],
        total: 2,
        page: 1,
        pageSize: 1,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [makeTeam(12, '康复团队')],
        total: 2,
        page: 2,
        pageSize: 1,
        totalPages: 2,
      });

    const { onChange } = renderSelect([11]);

    await user.click(screen.getByRole('button', { name: /已选择 1 个团队/ }));

    await waitFor(() => {
      expect(loadOptions).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    });
    expect(screen.queryByText(/骨科团队 ×/)).toBeNull();

    await user.click(screen.getByRole('button', { name: '下一页' }));

    await waitFor(() => {
      expect(loadOptions).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 });
    });

    await user.click(screen.getByRole('checkbox', { name: /康复团队/ }));

    expect(onChange).toHaveBeenCalledWith([11, 12]);
  });

  it('closes the team list from outside click and escape', async () => {
    const user = userEvent.setup();
    loadOptions.mockResolvedValue({
      items: [makeTeam(11, '骨科团队')],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <div>
        <TeamMultiSelect
          selectedIds={[]}
          placeholder="选择归属团队"
          searchPlaceholder="搜索团队名"
          loadOptions={loadOptions}
          onChange={jest.fn()}
        />
        <button type="button">外部区域</button>
      </div>
    );

    await user.click(screen.getByRole('button', { name: /选择归属团队/ }));
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /骨科团队/ })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: /选择归属团队/ }));
    expect(screen.queryByRole('checkbox', { name: /骨科团队/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: /选择归属团队/ }));
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /骨科团队/ })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: '外部区域' }));
    expect(screen.queryByRole('checkbox', { name: /骨科团队/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: /选择归属团队/ }));
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /骨科团队/ })).toBeTruthy();
    });

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('checkbox', { name: /骨科团队/ })).toBeNull();
  });

  it('stays open and renders custom empty text when no teams are available', async () => {
    const user = userEvent.setup();
    loadOptions.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    render(
      <TeamMultiSelect
        selectedIds={[]}
        placeholder="选择归属团队"
        searchPlaceholder="搜索团队名"
        emptyText="没有可选择的团队"
        loadOptions={loadOptions}
        onChange={jest.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /选择归属团队/ }));

    expect(await screen.findByText('没有可选择的团队')).toBeTruthy();
    expect(screen.getByRole('button', { name: /选择归属团队/ })).toBeTruthy();
  });
});
