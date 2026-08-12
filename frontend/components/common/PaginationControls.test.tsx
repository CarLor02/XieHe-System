import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, jest } from '@jest/globals';

import PaginationControls from './PaginationControls';

it('shows at most ten direct page buttons for the current page window', () => {
  const { rerender } = render(
    <PaginationControls currentPage={1} totalPages={25} onPageChange={jest.fn()} />
  );

  expect(screen.getByRole('button', { name: '1' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '10' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '11' })).not.toBeTruthy();

  rerender(
    <PaginationControls currentPage={11} totalPages={25} onPageChange={jest.fn()} />
  );

  expect(screen.queryByRole('button', { name: '10' })).not.toBeTruthy();
  expect(screen.getByRole('button', { name: '11' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '20' })).toBeTruthy();
});

it('changes to a valid input page and falls back to page one for invalid input', async () => {
  const user = userEvent.setup();
  const onPageChange = jest.fn();
  render(
    <PaginationControls
      currentPage={1}
      totalPages={20}
      onPageChange={onPageChange}
    />
  );
  const input = screen.getByRole('spinbutton', { name: '页码' });

  await user.clear(input);
  await user.type(input, '12{Enter}');
  expect(onPageChange).toHaveBeenLastCalledWith(12);

  await user.clear(input);
  await user.type(input, '21{Enter}');
  expect(onPageChange).toHaveBeenLastCalledWith(1);
});

it('uses separated triangle buttons to adjust the page input before confirmation', async () => {
  const user = userEvent.setup();
  const onPageChange = jest.fn();
  render(
    <PaginationControls
      currentPage={5}
      totalPages={20}
      onPageChange={onPageChange}
    />
  );
  const input = screen.getByRole('spinbutton', { name: '页码' });

  await user.click(screen.getByRole('button', { name: '页码增加一页' }));
  expect((input as HTMLInputElement).value).toBe('6');
  expect(onPageChange).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: '页码减少一页' }));
  expect((input as HTMLInputElement).value).toBe('5');

  await user.type(input, '{ArrowUp}{Enter}');
  expect(onPageChange).toHaveBeenLastCalledWith(6);
});
