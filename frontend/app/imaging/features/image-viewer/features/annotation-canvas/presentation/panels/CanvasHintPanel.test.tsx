import { render, screen } from '@testing-library/react';
import { expect, it } from '@jest/globals';

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
      keypoints={[]}
      keypointSequenceSession={keypointSequenceSession}
    />
  );

  expect(screen.getByText('正在补充 L5：下一点 L5-2，已完成 1/4')).toBeTruthy();
  expect(screen.getByText('按 Esc 取消剩余补点')).toBeTruthy();
});

it('shows the bound keypoint group for a manual CSS measurement', () => {
  render(
    <CanvasHintPanel
      selectedTool="css"
      isImagePanLocked={false}
      isHovering={false}
      clickedPointsCount={1}
      pointsNeeded={2}
      currentTool={{
        id: 'css',
        name: 'CSS',
        icon: 'test',
        description: 'test',
        pointsNeeded: 2,
      }}
      keypoints={[]}
    />
  );

  expect(screen.getByText('骶骨点待排序点 2/2')).toBeTruthy();
});

it('shows AVT reference placement progress before disc anchors', () => {
  render(
    <CanvasHintPanel
      selectedTool="avt"
      isImagePanLocked={false}
      isHovering={false}
      clickedPointsCount={0}
      pointsNeeded={0}
      currentTool={null}
      keypoints={[]}
      avtPlacementSession={{
        target: {
          type: 'disc',
          upperVertebra: 'T12',
          lowerVertebra: 'L1',
        },
        step: {
          kind: 'keypoint',
          phase: 'reference',
          label: 'CSVL',
          keypointId: 'SR',
          completedCount: 1,
          totalCount: 2,
        },
      }}
    />
  );

  expect(
    screen.getByText('正在补充 CSVL：下一点 SR，已标注 1/2 个点')
  ).toBeTruthy();
});
