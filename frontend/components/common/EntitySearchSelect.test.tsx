import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import EntitySearchSelect, {
  type EntitySearchSelectPage,
} from './EntitySearchSelect';
import OverlayProvider from '@/components/overlay/OverlayProvider';
import { AppModal } from '@/components/overlay/overlay-components';

type Doctor = {
  id: number;
  real_name: string;
  email: string;
  role: string;
};

const loadOptions = jest.fn<
  (params: { page: number; pageSize: number; search?: string }) => Promise<EntitySearchSelectPage<Doctor>>
>();

function makePage(items: Doctor[], totalPages = 1): EntitySearchSelectPage<Doctor> {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 10,
    totalPages,
  };
}

function renderSelect(onChange = jest.fn()) {
  return render(
    <EntitySearchSelect
      value=""
      placeholder="选择上传者"
      searchPlaceholder="搜索医生姓名或邮箱"
      pageSize={10}
      loadOptions={loadOptions}
      getOptionValue={doctor => String(doctor.id)}
      mapOption={doctor => ({
        primary: doctor.real_name,
        secondary: doctor.email,
        meta: [doctor.role],
      })}
      onChange={onChange}
    />
  );
}

describe('EntitySearchSelect', () => {
  beforeEach(() => {
    jest.useRealTimers();
    loadOptions.mockReset();
  });

  it('loads selectable entities with mapped fields', async () => {
    const user = userEvent.setup();
    loadOptions.mockResolvedValue(
      makePage([
        {
          id: 7,
          real_name: '王医生',
          email: 'doctor@example.com',
          role: 'ADMIN',
        },
      ])
    );
    const onChange = jest.fn();

    renderSelect(onChange);
    await user.click(screen.getByRole('button', { name: /选择上传者/ }));

    await waitFor(() => {
      expect(loadOptions).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
      });
    });

    await user.click(screen.getByRole('option', { name: /王医生/ }));

    expect(screen.getByText(/doctor@example.com/)).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith('7', {
      id: 7,
      real_name: '王医生',
      email: 'doctor@example.com',
      role: 'ADMIN',
    });
  });

  it('debounces search and can clear the selected value', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    loadOptions
      .mockResolvedValueOnce(
        makePage([
          {
            id: 7,
            real_name: '王医生',
            email: 'doctor@example.com',
            role: 'ADMIN',
          },
        ])
      )
      .mockResolvedValue(
        makePage([
          {
            id: 8,
            real_name: '李医生',
            email: 'li@example.com',
            role: 'MEMBER',
          },
        ])
      );
    const onChange = jest.fn();

    render(
      <EntitySearchSelect
        value="7"
        selectedItem={{
          id: 7,
          real_name: '王医生',
          email: 'doctor@example.com',
          role: 'ADMIN',
        }}
        placeholder="选择上传者"
        searchPlaceholder="搜索医生姓名或邮箱"
        loadOptions={loadOptions}
        getOptionValue={doctor => String(doctor.id)}
        mapOption={doctor => ({
          primary: doctor.real_name,
          secondary: doctor.email,
          meta: [doctor.role],
        })}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /王医生/ }));
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('搜索医生姓名或邮箱'), {
      target: { value: '李医生' },
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(loadOptions).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 10,
        search: '李医生',
      });
    });

    await user.click(screen.getByRole('button', { name: /清除选择/ }));

    expect(onChange).toHaveBeenCalledWith('', null);
  });

  it('renders the clear control as an integrated segment of the selector', () => {
    render(
      <EntitySearchSelect
        value="7"
        selectedItem={{
          id: 7,
          real_name: '王医生',
          email: 'doctor@example.com',
          role: 'ADMIN',
        }}
        placeholder="选择上传者"
        searchPlaceholder="搜索医生姓名或邮箱"
        loadOptions={loadOptions}
        getOptionValue={doctor => String(doctor.id)}
        mapOption={doctor => ({
          primary: doctor.real_name,
          secondary: doctor.email,
          meta: [doctor.role],
        })}
        onChange={jest.fn()}
      />
    );

    const clearButton = screen.getByRole('button', { name: /清除选择/ });
    const control = clearButton.closest('[data-testid="entity-search-select-control"]');

    expect(control).toBeTruthy();
    expect(control?.className).toContain('border');
    expect(clearButton.className).toContain('border-l');
    expect(clearButton.className).not.toContain('rounded-lg border');
  });

  it('keeps selector action icons vertically aligned', () => {
    render(
      <EntitySearchSelect
        value="7"
        selectedItem={{
          id: 7,
          real_name: '王医生',
          email: 'doctor@example.com',
          role: 'ADMIN',
        }}
        placeholder="选择上传者"
        searchPlaceholder="搜索医生姓名或邮箱"
        loadOptions={loadOptions}
        getOptionValue={doctor => String(doctor.id)}
        mapOption={doctor => ({
          primary: doctor.real_name,
          secondary: doctor.email,
          meta: [doctor.role],
        })}
        onChange={jest.fn()}
      />
    );

    const triggerButton = screen.getByRole('button', { name: /王医生/ });
    const clearButton = screen.getByRole('button', { name: /清除选择/ });
    const arrowIcon = triggerButton.querySelector('.ri-arrow-down-s-line');
    const closeIcon = clearButton.querySelector('.ri-close-line');

    expect(triggerButton.className).toContain('h-10');
    expect(clearButton.className).toContain('h-10');
    expect(arrowIcon?.className).toContain('h-4');
    expect(arrowIcon?.className).toContain('w-4');
    expect(closeIcon?.className).toContain('h-4');
    expect(closeIcon?.className).toContain('w-4');
  });

  it('keeps pagination controls on a single line', async () => {
    const user = userEvent.setup();
    loadOptions.mockResolvedValue(makePage([], 1));

    renderSelect();
    await user.click(screen.getByRole('button', { name: /选择上传者/ }));

    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1));

    const previousButton = screen.getByRole('button', { name: '上一页' });
    const nextButton = screen.getByRole('button', { name: '下一页' });
    const pageText = screen.getByText('第 1 / 1 页');
    const paginationFooter = previousButton.parentElement;

    expect(paginationFooter?.className).toContain('justify-center');
    expect(previousButton.className).toContain('whitespace-nowrap');
    expect(nextButton.className).toContain('whitespace-nowrap');
    expect(pageText.className).toContain('whitespace-nowrap');
  });

  it('keeps a modal combobox open while a page request is pending', async () => {
    const user = userEvent.setup();
    let resolveSecondPage:
      | ((page: EntitySearchSelectPage<Doctor>) => void)
      | undefined;
    const secondPage = new Promise<EntitySearchSelectPage<Doctor>>(resolve => {
      resolveSecondPage = resolve;
    });
    loadOptions
      .mockResolvedValueOnce(
        makePage(
          [
            {
              id: 7,
              real_name: '第一页医生',
              email: 'page1@example.com',
              role: 'MEMBER',
            },
          ],
          2
        )
      )
      .mockReturnValueOnce(secondPage);

    render(
      <OverlayProvider>
        <AppModal open title="选择医生">
          <EntitySearchSelect
            value=""
            placeholder="选择上传者"
            searchPlaceholder="搜索医生姓名或邮箱"
            loadOptions={loadOptions}
            getOptionValue={doctor => String(doctor.id)}
            mapOption={doctor => ({
              primary: doctor.real_name,
              secondary: doctor.email,
              meta: [doctor.role],
            })}
            onChange={jest.fn()}
          />
        </AppModal>
      </OverlayProvider>
    );

    await user.click(screen.getByRole('button', { name: /选择上传者/ }));
    await screen.findByText('第一页医生');
    const nextButton = screen.getByRole('button', { name: '下一页' });

    await user.click(nextButton);
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(2));

    expect(document.activeElement).toBe(nextButton);
    expect(nextButton.getAttribute('aria-disabled')).toBe('true');
    expect(nextButton.hasAttribute('disabled')).toBe(false);
    expect(
      screen.getByPlaceholderText('搜索医生姓名或邮箱')
    ).toBeTruthy();

    await act(async () => {
      resolveSecondPage?.(
        makePage(
          [
            {
              id: 8,
              real_name: '第二页医生',
              email: 'page2@example.com',
              role: 'MEMBER',
            },
          ],
          2
        )
      );
    });

    await screen.findByText('第二页医生');
    expect(
      screen.getByPlaceholderText('搜索医生姓名或邮箱')
    ).toBeTruthy();
    expect(document.activeElement).toBe(nextButton);
    expect(nextButton.getAttribute('aria-disabled')).toBe('true');
  });

  it('uses the controlled selected item when the parent clears selection', () => {
    const selectedDoctor = {
      id: 7,
      real_name: '王医生',
      email: 'doctor@example.com',
      role: 'ADMIN',
    };
    const onChange = jest.fn();
    const props = {
      placeholder: '选择上传者',
      searchPlaceholder: '搜索医生姓名或邮箱',
      loadOptions,
      getOptionValue: (doctor: Doctor) => String(doctor.id),
      mapOption: (doctor: Doctor) => ({
        primary: doctor.real_name,
        secondary: doctor.email,
        meta: [doctor.role],
      }),
      onChange,
    };

    const { rerender } = render(
      <EntitySearchSelect value="7" selectedItem={selectedDoctor} {...props} />
    );

    expect(screen.getByRole('button', { name: /王医生/ })).toBeTruthy();

    rerender(<EntitySearchSelect value="" selectedItem={null} {...props} />);

    expect(screen.getByRole('button', { name: /选择上传者/ })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /清除选择/ })
    ).not.toBeTruthy();
  });

  it('closes the entity list from outside click and escape', async () => {
    const user = userEvent.setup();
    loadOptions.mockResolvedValue(
      makePage([
        {
          id: 7,
          real_name: '王医生',
          email: 'doctor@example.com',
          role: 'ADMIN',
        },
      ])
    );

    render(
      <div>
        <EntitySearchSelect
          value=""
          placeholder="选择上传者"
          searchPlaceholder="搜索医生姓名或邮箱"
          loadOptions={loadOptions}
          getOptionValue={doctor => String(doctor.id)}
          mapOption={doctor => ({
            primary: doctor.real_name,
            secondary: doctor.email,
            meta: [doctor.role],
          })}
          onChange={jest.fn()}
        />
        <button type="button">外部区域</button>
      </div>
    );

    await user.click(screen.getByRole('button', { name: /选择上传者/ }));
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /王医生/ })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: /选择上传者/ }));
    expect(screen.queryByRole('option', { name: /王医生/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: /选择上传者/ }));
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /王医生/ })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: '外部区域' }));
    expect(screen.queryByRole('option', { name: /王医生/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: /选择上传者/ }));
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /王医生/ })).toBeTruthy();
    });

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('option', { name: /王医生/ })).toBeNull();
  });
});
