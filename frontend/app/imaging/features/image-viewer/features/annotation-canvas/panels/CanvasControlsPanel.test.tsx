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
