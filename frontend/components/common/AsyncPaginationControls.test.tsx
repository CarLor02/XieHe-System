import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, jest } from '@jest/globals';

import AsyncPaginationControls from './AsyncPaginationControls';

it('keeps dynamic unavailable controls focusable and guards page changes', async () => {
  const user = userEvent.setup();
  const onPageChange = jest.fn();
  const { rerender } = render(
    <AsyncPaginationControls
      page={1}
      totalPages={2}
      loading={false}
      onPageChange={onPageChange}
    />
  );

  const previousButton = screen.getByRole('button', { name: '上一页' });
  const nextButton = screen.getByRole('button', { name: '下一页' });

  expect(previousButton.getAttribute('aria-disabled')).toBe('true');
  expect(previousButton.hasAttribute('disabled')).toBe(false);
  await user.click(previousButton);
  expect(onPageChange).not.toHaveBeenCalled();

  await user.click(nextButton);
  expect(onPageChange).toHaveBeenCalledWith(2);
  expect(document.activeElement).toBe(nextButton);

  rerender(
    <AsyncPaginationControls
      page={2}
      totalPages={2}
      loading
      onPageChange={onPageChange}
    />
  );

  expect(document.activeElement).toBe(nextButton);
  expect(nextButton.getAttribute('aria-disabled')).toBe('true');
  expect(nextButton.hasAttribute('disabled')).toBe(false);
  await user.click(nextButton);
  expect(onPageChange).toHaveBeenCalledTimes(1);
});
