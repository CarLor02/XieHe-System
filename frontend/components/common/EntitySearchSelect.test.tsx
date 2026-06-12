import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import EntitySearchSelect, {
  type EntitySearchSelectPage,
} from './EntitySearchSelect';

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
    fireEvent.click(screen.getByRole('button', { name: /选择上传者/ }));

    await waitFor(() => {
      expect(loadOptions).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
      });
    });

    fireEvent.click(screen.getByRole('option', { name: /王医生/ }));

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

    fireEvent.click(screen.getByRole('button', { name: /王医生/ }));
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

    fireEvent.click(screen.getByRole('button', { name: /清除选择/ }));

    expect(onChange).toHaveBeenCalledWith('', null);
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
});
