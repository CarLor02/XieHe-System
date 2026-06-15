import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import CanvasControlsPanel from './CanvasControlsPanel';

function renderPanel(overrides: Partial<Parameters<typeof CanvasControlsPanel>[0]> = {}) {
  return render(
    <CanvasControlsPanel
      imageScale={1}
      contrast={0}
      brightness={0}
      onClearAll={jest.fn()}
      onZoomOut={jest.fn()}
      onZoomIn={jest.fn()}
      onDecreaseContrast={jest.fn()}
      onIncreaseContrast={jest.fn()}
      onDecreaseBrightness={jest.fn()}
      onIncreaseBrightness={jest.fn()}
      canUndoAnnotationHistory={false}
      onUndoAnnotationHistory={jest.fn()}
      canRedoAnnotationHistory={false}
      onRedoAnnotationHistory={jest.fn()}
      showVertebraeBoundingBox={true}
      onToggleVertebraeBoundingBox={jest.fn()}
      {...overrides}
    />
  );
}

it('disables the annotation undo button when no history is available', () => {
  renderPanel();

  expect(
    (screen.getByRole('button', { name: '撤回' }) as HTMLButtonElement).disabled
  ).toBe(true);
});

it('calls the annotation undo handler from the controls panel', () => {
  const onUndoAnnotationHistory = jest.fn();
  renderPanel({
    canUndoAnnotationHistory: true,
    onUndoAnnotationHistory,
  });

  fireEvent.click(screen.getByRole('button', { name: '撤回' }));

  expect(onUndoAnnotationHistory).toHaveBeenCalledTimes(1);
});

it('disables the annotation redo button when no redo history is available', () => {
  renderPanel();

  expect(
    (screen.getByRole('button', { name: '重做' }) as HTMLButtonElement).disabled
  ).toBe(true);
});

it('calls the annotation redo handler from the controls panel', () => {
  const onRedoAnnotationHistory = jest.fn();
  renderPanel({
    canRedoAnnotationHistory: true,
    onRedoAnnotationHistory,
  });

  fireEvent.click(screen.getByRole('button', { name: '重做' }));

  expect(onRedoAnnotationHistory).toHaveBeenCalledTimes(1);
});

it('asks for confirmation before clearing all annotations', () => {
  const onClearAll = jest.fn();
  const confirmSpy = jest.spyOn(window, 'confirm');

  renderPanel({ onClearAll });

  fireEvent.click(screen.getByRole('button', { name: '清空全部' }));

  expect(confirmSpy).not.toHaveBeenCalled();
  expect(onClearAll).not.toHaveBeenCalled();
  expect(screen.getByText('确定要清空所有标注吗?')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: '确定' }));

  expect(onClearAll).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('确定要清空所有标注吗?')).toBeNull();

  confirmSpy.mockRestore();
});

it('can cancel the clear-all confirmation', () => {
  const onClearAll = jest.fn();
  renderPanel({ onClearAll });

  fireEvent.click(screen.getByRole('button', { name: '清空全部' }));
  fireEvent.click(screen.getByRole('button', { name: '取消' }));

  expect(onClearAll).not.toHaveBeenCalled();
  expect(screen.queryByText('确定要清空所有标注吗?')).toBeNull();
});

it('shows the vertebrae bounding box toggle as enabled by default', () => {
  renderPanel();

  expect(screen.getByText('检测层显示椎体方框')).toBeTruthy();
  expect(screen.getByRole('button', { name: '检测层显示椎体方框' }).textContent).toBe(
    '✅'
  );
});

it('calls the vertebrae bounding box toggle handler from the controls panel', () => {
  const onToggleVertebraeBoundingBox = jest.fn();
  renderPanel({
    showVertebraeBoundingBox: false,
    onToggleVertebraeBoundingBox,
  });

  fireEvent.click(screen.getByRole('button', { name: '检测层显示椎体方框' }));

  expect(onToggleVertebraeBoundingBox).toHaveBeenCalledTimes(1);
});
