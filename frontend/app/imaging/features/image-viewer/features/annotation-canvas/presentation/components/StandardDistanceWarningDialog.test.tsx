import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, jest } from '@jest/globals';

import OverlayProvider from '@/components/overlay/OverlayProvider';
import StandardDistanceWarningDialog from './StandardDistanceWarningDialog';

it('renders the standard distance guidance and closes from the action button', async () => {
  const user = userEvent.setup();
  const handleClose = jest.fn();

  render(
    <OverlayProvider>
      <StandardDistanceWarningDialog open onClose={handleClose} />
    </OverlayProvider>
  );

  expect(await screen.findByText('请先设置标准距离')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: '我知道了' }));

  expect(handleClose).toHaveBeenCalledTimes(1);
});
