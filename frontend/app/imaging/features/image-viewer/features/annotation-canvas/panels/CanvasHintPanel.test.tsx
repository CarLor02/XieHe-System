import { render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import CanvasHintPanel from './CanvasHintPanel';
import type { KeypointSequenceSession } from '@/app/imaging/features/image-viewer/shared/types';

it('shows progress for sequential keypoint placement', () => {
  const keypointSequenceSession: KeypointSequenceSession = {
    groupName: 'L5',
    keypointIds: ['L5-1', 'L5-2', 'L5-3', 'L5-4'],
    currentIndex: 1,
  };

  render(
    <CanvasHintPanel
      selectedTool="hand"
      isImagePanLocked={false}
      isHovering={false}
      clickedPointsCount={0}
      pointsNeeded={0}
      currentTool={null}
      measurements={[]}
      getInheritedPoints={jest.fn(() => ({ points: [], count: 0 }))}
      keypointSequenceSession={keypointSequenceSession}
    />
  );

  expect(
    screen.getByText('正在补充 L5：下一点 L5-2，已完成 1/4')
  ).toBeTruthy();
  expect(screen.getByText('按 Esc 取消剩余补点')).toBeTruthy();
});
