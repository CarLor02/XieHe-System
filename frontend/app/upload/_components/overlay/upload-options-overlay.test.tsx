import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import UploadOptionsOverlay, {
  type CropArea,
  type UploadOptionsConfirmOptions,
} from './upload-options-overlay';

type CropHandler = (fileId: string, crop: CropArea) => void | Promise<void>;
type ConfirmHandler = (
  options?: UploadOptionsConfirmOptions
) => void | Promise<void>;

function renderOverlay({
  onCrop = jest.fn<CropHandler>(),
  onConfirm = jest.fn<ConfirmHandler>(),
  onTeamIdsChange = jest.fn<(teamIds: number[]) => void>(),
}: {
  onCrop?: jest.MockedFunction<CropHandler>;
  onConfirm?: jest.MockedFunction<ConfirmHandler>;
  onTeamIdsChange?: jest.MockedFunction<(teamIds: number[]) => void>;
} = {}) {
  render(
    <UploadOptionsOverlay
      file={{
        id: '1',
        name: 'xray.png',
        previewUrl: 'blob:test',
        examType: '正位X光片',
        flipped: false,
        cropped: false,
        mimeType: 'image/png',
      }}
      examTypes={['正位X光片']}
      onExamTypeChange={jest.fn()}
      onFlip={jest.fn()}
      onCrop={onCrop}
      onClose={jest.fn()}
      onConfirm={onConfirm}
      confirmAppliesCrop={false}
      teamIds={[]}
      teamOptions={[
        {
          id: 11,
          name: '骨科团队',
          member_count: 3,
          is_member: true,
          my_role: 'ADMIN',
          my_status: 'ACTIVE',
        },
      ]}
      onTeamIdsChange={onTeamIdsChange}
    />
  );

  return { onCrop, onConfirm, onTeamIdsChange };
}

it('can defer applying an active crop to the outer confirm flow', async () => {
  const { onCrop, onConfirm } = renderOverlay();

  fireEvent.click(screen.getByRole('button', { name: /裁剪影像/ }));
  fireEvent.click(screen.getByRole('button', { name: '确认' }));

  await waitFor(() => {
    expect(onConfirm).toHaveBeenCalledWith({
      pendingCrop: {
        x: 0.06,
        y: 0.04,
        width: 0.88,
        height: 0.9,
      },
    });
  });
  expect(onCrop).not.toHaveBeenCalled();
});

it('lets users select image team ownership in the overlay', async () => {
  const { onTeamIdsChange } = renderOverlay();

  fireEvent.click(screen.getByRole('button', { name: /选择归属团队/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /骨科团队/ }));

  expect(onTeamIdsChange).toHaveBeenCalledWith([11]);
});
