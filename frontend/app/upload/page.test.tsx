import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, expect, it, jest } from '@jest/globals';
import type { ReactNode } from 'react';

const mockPush = jest.fn();
const mockUploadSingleFile = jest.fn();
const mockGetAssignableImageTeams =
  jest.fn<(filters?: unknown) => Promise<unknown>>();
const mockUseUser = jest.fn();
let mockLatestOverlayProps: {
  teamIds: number[];
  onTeamIdsChange: (teamIds: number[]) => void;
  onConfirm: () => void | Promise<void>;
} | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/api', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('@/services/imageServices', () => ({
  uploadSingleFile: (...args: unknown[]) => mockUploadSingleFile(...args),
}));

jest.mock('@/services/imageServices/imageFileService', () => ({
  getAssignableImageTeams: (...args: unknown[]) =>
    mockGetAssignableImageTeams(...args),
}));

jest.mock('@/components/layout/AppShell', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock('./_components/patient-search-select', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (patientId: string) => void }) => (
    <button type="button" onClick={() => onChange('3')}>
      选择测试患者
    </button>
  ),
}));

jest.mock('./_components/overlay/upload-options-overlay', () => ({
  __esModule: true,
  default: (props: {
    teamIds: number[];
    onTeamIdsChange: (teamIds: number[]) => void;
    onConfirm: () => void | Promise<void>;
  }) => {
    mockLatestOverlayProps = props;
    return (
      <div>
        <button type="button" onClick={() => props.onTeamIdsChange([11])}>
          模拟选择团队
        </button>
        <button type="button" onClick={() => props.onConfirm()}>
          模拟确认信息
        </button>
      </div>
    );
  },
}));

function uploadTestFiles(count = 1) {
  const input = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  const files = Array.from(
    { length: count },
    (_, index) =>
      new File(['xray'], `xray-${index + 1}.png`, { type: 'image/png' })
  );

  fireEvent.change(input, { target: { files } });
}

function uploadTestFile() {
  uploadTestFiles();
}

async function confirmUploadOptions(count: number) {
  for (let index = 0; index < count; index += 1) {
    const button = await screen.findByRole('button', {
      name: '模拟确认信息',
    });
    fireEvent.click(button);
  }
}

beforeEach(() => {
  localStorage.clear();
  mockPush.mockReset();
  mockUploadSingleFile.mockReset();
  mockGetAssignableImageTeams.mockReset();
  mockLatestOverlayProps = null;
  mockUseUser.mockReturnValue({
    isAuthenticated: true,
    user: {
      id: 7,
      username: 'doctor',
      email: 'doctor@example.com',
      full_name: 'Doctor',
    },
  });
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: jest.fn(() => 'blob:test'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
});

it('applies the current user upload ownership preference to new files', async () => {
  localStorage.setItem(
    'xiehe:image-ownership-preference:7:upload',
    JSON.stringify({
      version: 1,
      scope: 'team',
      teamIds: [11, 12],
      updatedAt: '2026-06-26T00:00:00.000Z',
    })
  );

  const { default: UploadPage } = await import('./page');

  render(<UploadPage />);
  await waitFor(() =>
    expect(document.querySelector('input[type="file"]')).toBeTruthy()
  );

  uploadTestFile();

  await waitFor(() => {
    expect(mockLatestOverlayProps?.teamIds).toEqual([11, 12]);
  });
});

it('drops remembered upload teams that are no longer assignable', async () => {
  localStorage.setItem(
    'xiehe:image-ownership-preference:7:upload',
    JSON.stringify({
      version: 1,
      scope: 'team',
      teamIds: [11, 99],
      updatedAt: '2026-06-26T00:00:00.000Z',
    })
  );
  mockGetAssignableImageTeams.mockResolvedValue({
    items: [{ id: 11, name: '骨科团队', member_count: 1, is_member: true }],
    total: 1,
    page: 1,
    pageSize: 100,
    totalPages: 1,
  });

  const { default: UploadPage } = await import('./page');

  render(<UploadPage />);
  await waitFor(() =>
    expect(document.querySelector('input[type="file"]')).toBeTruthy()
  );

  uploadTestFile();

  await waitFor(() => {
    expect(mockLatestOverlayProps?.teamIds).toEqual([11]);
  });
  expect(
    JSON.parse(
      localStorage.getItem('xiehe:image-ownership-preference:7:upload') || '{}'
    )
  ).toMatchObject({
    version: 1,
    scope: 'team',
    teamIds: [11],
  });
});

it('stores the current user upload ownership preference after overlay confirm', async () => {
  const { default: UploadPage } = await import('./page');

  render(<UploadPage />);
  await waitFor(() =>
    expect(document.querySelector('input[type="file"]')).toBeTruthy()
  );

  uploadTestFile();

  await waitFor(() => {
    expect(mockLatestOverlayProps?.teamIds).toEqual([]);
  });

  fireEvent.click(screen.getByRole('button', { name: '模拟选择团队' }));

  await waitFor(() => {
    expect(mockLatestOverlayProps?.teamIds).toEqual([11]);
  });

  fireEvent.click(screen.getByRole('button', { name: '模拟确认信息' }));

  await waitFor(() => {
    expect(
      JSON.parse(
        localStorage.getItem('xiehe:image-ownership-preference:7:upload') ||
          '{}'
      )
    ).toMatchObject({
      version: 1,
      scope: 'team',
      teamIds: [11],
    });
  });
});

it('shows intermediate byte progress before the upload completes', async () => {
  let finishUpload: (() => void) | undefined;
  mockUploadSingleFile.mockImplementation((rawRequest: unknown) => {
    const request = rawRequest as {
      onProgress?: (progress: {
        phase: string;
        loadedBytes: number;
        totalBytes: number;
        percentage: number;
      }) => void;
    };
    request.onProgress?.({
      phase: 'uploading',
      loadedBytes: 37,
      totalBytes: 100,
      percentage: 37,
    });
    return new Promise(resolve => {
      finishUpload = () => resolve({ image_file_id: 1 });
    });
  });
  const { default: UploadPage } = await import('./page');

  render(<UploadPage />);
  await waitFor(() =>
    expect(document.querySelector('input[type="file"]')).toBeTruthy()
  );
  fireEvent.click(screen.getByRole('button', { name: '选择测试患者' }));
  uploadTestFile();
  await confirmUploadOptions(1);
  fireEvent.click(screen.getByRole('button', { name: '开始上传' }));

  await screen.findByText('37%');
  await act(async () => finishUpload?.());
  await screen.findByText('上传完成');
});

it('uploads at most two files concurrently and continues after one finishes', async () => {
  let active = 0;
  let peak = 0;
  const finishUploads: Array<() => void> = [];
  mockUploadSingleFile.mockImplementation(
    () =>
      new Promise(resolve => {
        active += 1;
        peak = Math.max(peak, active);
        finishUploads.push(() => {
          active -= 1;
          resolve({ image_file_id: 1 });
        });
      })
  );
  const { default: UploadPage } = await import('./page');

  render(<UploadPage />);
  await waitFor(() =>
    expect(document.querySelector('input[type="file"]')).toBeTruthy()
  );
  fireEvent.click(screen.getByRole('button', { name: '选择测试患者' }));
  uploadTestFiles(3);
  await confirmUploadOptions(3);
  fireEvent.click(screen.getByRole('button', { name: '开始上传' }));

  await waitFor(() => expect(mockUploadSingleFile).toHaveBeenCalledTimes(2));
  expect(peak).toBe(2);

  await act(async () => finishUploads[0]?.());
  await waitFor(() => expect(mockUploadSingleFile).toHaveBeenCalledTimes(3));
  expect(peak).toBe(2);

  await act(async () => {
    finishUploads.slice(1).forEach(finish => finish());
  });
  await waitFor(() => expect(screen.getAllByText('上传完成')).toHaveLength(3));
});
