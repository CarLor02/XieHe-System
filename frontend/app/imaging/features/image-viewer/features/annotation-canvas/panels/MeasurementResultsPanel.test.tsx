import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import MeasurementResultsPanel from './MeasurementResultsPanel';
import { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

function renderPanel(
  measurements: MeasurementData[],
  onCobbKeypointsSync = jest.fn()
) {
  return render(
    <MeasurementResultsPanel
      showResults={true}
      hideAllLabels={false}
      hideAllAnnotations={false}
      isStandardDistanceHidden={false}
      standardDistance={null}
      standardDistancePoints={[]}
      measurements={measurements}
      keypoints={[]}
      selectionState={{
        measurementId: null,
        pointIndex: null,
        type: null,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
      }}
      hoverState={{
        measurementId: null,
        keypointId: null,
        pointIndex: null,
        elementType: null,
      }}
      hiddenMeasurementIds={new Set<string>()}
      hiddenAnnotationIds={new Set<string>()}
      hiddenKeypointIds={new Set<string>()}
      onToggleResults={jest.fn()}
      onToggleAllAnnotations={jest.fn()}
      onToggleAllLabels={jest.fn()}
      onToggleStandardDistanceVisibility={jest.fn()}
      onToggleMeasurementAnnotation={jest.fn()}
      onToggleMeasurementLabel={jest.fn()}
      onMeasurementHover={jest.fn()}
      onMeasurementSelect={jest.fn()}
      onMeasurementDelete={jest.fn()}
      onKeypointHover={jest.fn()}
      onToggleKeypointVisibility={jest.fn()}
      onKeypointDelete={jest.fn()}
      onMeasurementUpdate={jest.fn()}
      onCobbKeypointsSync={onCobbKeypointsSync}
    />
  );
}

it('shows the Cobb sequence number together with endpoint vertebrae in the measurement list', () => {
  renderPanel([
    {
      id: 'cobb-1',
      type: 'cobb1',
      value: '18.20°',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      upperVertebra: 'T5',
      lowerVertebra: 'T12',
    },
  ]);

  expect(
    screen.getByText(
      (_, element) =>
        element?.tagName.toLowerCase() === 'span' &&
        element.textContent === 'Cobb1(T5-T12)'
    )
  ).toBeTruthy();
});

it('shows a disabled Cobb sync button until both endpoint vertebrae are filled', () => {
  renderPanel([
    {
      id: 'cobb-1',
      type: 'cobb1',
      value: '18.20°',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      upperVertebra: 'T5',
      lowerVertebra: null,
    },
  ]);

  expect(
    (screen.getByRole('button', {
      name: '同步检测层',
    }) as HTMLButtonElement).disabled
  ).toBe(true);
});

it('syncs a completed Cobb measurement to the detection layer from the measurement list', () => {
  const onCobbKeypointsSync = jest.fn();
  renderPanel(
    [
      {
        id: 'cobb-1',
        type: 'cobb1',
        value: '18.20°',
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        upperVertebra: 'T5',
        lowerVertebra: 'T12',
      },
    ],
    onCobbKeypointsSync
  );

  const syncButton = screen.getByRole('button', { name: '同步检测层' });
  expect((syncButton as HTMLButtonElement).disabled).toBe(false);

  fireEvent.click(syncButton);

  expect(onCobbKeypointsSync).toHaveBeenCalledWith('cobb-1');
});
