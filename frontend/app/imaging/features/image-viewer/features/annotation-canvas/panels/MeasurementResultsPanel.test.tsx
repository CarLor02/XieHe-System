import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';
import type { ComponentProps } from 'react';

import MeasurementResultsPanel from './MeasurementResultsPanel';
import { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

function renderPanel(
  measurements: MeasurementData[],
  onCobbKeypointsSync = jest.fn(),
  overrides: Partial<ComponentProps<typeof MeasurementResultsPanel>> = {}
) {
  return render(
    <MeasurementResultsPanel
      examType="正位X光片"
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
      {...overrides}
    />
  );
}

function getRenderedCobbMeasurementNames(): string[] {
  return Array.from(
    screen
      .getByTestId('measurement-results-scroll-content')
      .querySelectorAll('span')
  )
    .map(element => element.textContent ?? '')
    .filter(text => /^Cobb\d+\(/.test(text));
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

it('sorts numbered Cobb measurements by upper vertebra anatomical order', () => {
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
      upperVertebra: 'T10',
      lowerVertebra: 'L1',
    },
    {
      id: 'cobb-4',
      type: 'cobb4',
      value: '12.00°',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
    },
    {
      id: 'cobb-3',
      type: 'cobb3',
      value: '10.00°',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      upperVertebra: 'L1',
      lowerVertebra: 'L4',
    },
    {
      id: 'cobb-2',
      type: 'cobb2',
      value: '8.00°',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      upperVertebra: 'T2',
      lowerVertebra: 'T5',
    },
  ]);

  expect(getRenderedCobbMeasurementNames()).toEqual([
    'Cobb2(T2-T5)',
    'Cobb1(T10-L1)',
    'Cobb3(L1-L4)',
    'Cobb4(上端椎待定-下端椎待定)',
  ]);
});

it('sorts lateral numbered Cobb measurements by the same upper vertebra order', () => {
  renderPanel(
    [
      {
        id: 'lateral-cobb-1',
        type: 'lateral-cobb1',
        value: '18.20°',
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        upperVertebra: 'T12',
        lowerVertebra: 'L1',
      },
      {
        id: 'lateral-cobb-3',
        type: 'lateral-cobb3',
        value: '10.00°',
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        upperVertebra: 'T5',
        lowerVertebra: 'T12',
      },
      {
        id: 'lateral-cobb-2',
        type: 'lateral-cobb2',
        value: '8.00°',
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        upperVertebra: 'C2',
        lowerVertebra: 'C7',
      },
    ],
    jest.fn(),
    { examType: '侧位X光片' }
  );

  expect(getRenderedCobbMeasurementNames()).toEqual([
    'Cobb2(C2-C7)',
    'Cobb3(T5-T12)',
    'Cobb1(T12-L1)',
  ]);
});

it('shows pending endpoint labels for numbered Cobb measurements without vertebrae', () => {
  renderPanel([
    {
      id: 'cobb-4',
      type: 'cobb4',
      value: '12.00°',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
    },
  ]);

  expect(
    screen.getByText(
      (_, element) =>
        element?.tagName.toLowerCase() === 'span' &&
        element.textContent === 'Cobb4(上端椎待定-下端椎待定)'
    )
  ).toBeTruthy();
});

it('shows lateral numbered Cobb measurements with the same visible Cobb label', () => {
  renderPanel([
    {
      id: 'lateral-cobb-4',
      type: 'lateral-cobb4',
      value: '12.00°',
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
    },
  ]);

  expect(
    screen.getByText(
      (_, element) =>
        element?.tagName.toLowerCase() === 'span' &&
        element.textContent === 'Cobb4(上端椎待定-下端椎待定)'
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

it('disables Cobb sync when endpoint vertebrae are the same', () => {
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
        lowerVertebra: 'T5',
      },
    ],
    onCobbKeypointsSync
  );

  const syncButton = screen.getByRole('button', { name: '同步检测层' });
  expect((syncButton as HTMLButtonElement).disabled).toBe(true);

  fireEvent.click(syncButton);

  expect(onCobbKeypointsSync).not.toHaveBeenCalled();
});

it('selects Cobb endpoints from current exam vertebra options instead of free text input', () => {
  const onMeasurementUpdate = jest.fn();
  renderPanel(
    [
      {
        id: 'cobb-4',
        type: 'cobb4',
        value: '12.00°',
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
      },
    ],
    jest.fn(),
    {
      onMeasurementUpdate,
    }
  );

  fireEvent.click(screen.getByRole('button', { name: '上端椎待定' }));

  expect(screen.queryByPlaceholderText('上端椎待定')).toBeNull();
  const listbox = screen.getByRole('listbox', { name: '选择上端椎' });
  const options = within(listbox).getAllByRole('option');
  expect(
    screen.getByTestId('measurement-results-scroll-content').contains(listbox)
  ).toBe(false);
  expect(listbox.closest('.overflow-hidden')).toBeNull();
  expect(options.map(option => option.textContent)).toEqual([
    'C7',
    'T1',
    'T2',
    'T3',
    'T4',
    'T5',
    'T6',
    'T7',
    'T8',
    'T9',
    'T10',
    'T11',
    'T12',
    'L1',
    'L2',
    'L3',
    'L4',
    'L5',
  ]);
  expect(within(listbox).queryByRole('option', { name: 'C2' })).toBeNull();
  expect(within(listbox).queryByRole('option', { name: 'S1' })).toBeNull();

  fireEvent.click(within(listbox).getByRole('option', { name: 'T5' }));

  expect(onMeasurementUpdate).toHaveBeenCalledWith('cobb-4', {
    upperVertebra: 'T5',
  });
});

it('disables the opposite endpoint vertebra in the Cobb endpoint option list', () => {
  const onMeasurementUpdate = jest.fn();
  renderPanel(
    [
      {
        id: 'cobb-4',
        type: 'cobb4',
        value: '12.00°',
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        upperVertebra: 'T5',
        lowerVertebra: null,
      },
    ],
    jest.fn(),
    {
      onMeasurementUpdate,
    }
  );

  fireEvent.click(screen.getByRole('button', { name: '下端椎待定' }));

  const listbox = screen.getByRole('listbox', { name: '选择下端椎' });
  const usedEndpointOption = within(listbox).getByRole('option', {
    name: 'T5',
  }) as HTMLButtonElement;
  const availableEndpointOption = within(listbox).getByRole('option', {
    name: 'T6',
  });

  expect(usedEndpointOption.disabled).toBe(true);
  expect(usedEndpointOption.getAttribute('title')).toBe(
    '该椎体已作为上端椎使用'
  );

  fireEvent.click(usedEndpointOption);

  expect(onMeasurementUpdate).not.toHaveBeenCalled();

  fireEvent.click(availableEndpointOption);

  expect(onMeasurementUpdate).toHaveBeenCalledWith('cobb-4', {
    lowerVertebra: 'T6',
  });
});

it('disables the opposite endpoint vertebra in lateral Cobb endpoint options', () => {
  const onMeasurementUpdate = jest.fn();
  renderPanel(
    [
      {
        id: 'lateral-cobb-4',
        type: 'lateral-cobb4',
        value: '12.00°',
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        upperVertebra: 'T12',
        lowerVertebra: null,
      },
    ],
    jest.fn(),
    {
      examType: '侧位X光片',
      onMeasurementUpdate,
    }
  );

  fireEvent.click(screen.getByRole('button', { name: '下端椎待定' }));

  const listbox = screen.getByRole('listbox', { name: '选择下端椎' });
  const usedEndpointOption = within(listbox).getByRole('option', {
    name: 'T12',
  }) as HTMLButtonElement;
  const lateralOnlyEndpointOption = within(listbox).getByRole('option', {
    name: 'S1',
  });

  expect(usedEndpointOption.disabled).toBe(true);
  expect(usedEndpointOption.getAttribute('title')).toBe(
    '该椎体已作为上端椎使用'
  );

  fireEvent.click(usedEndpointOption);

  expect(onMeasurementUpdate).not.toHaveBeenCalled();

  fireEvent.click(lateralOnlyEndpointOption);

  expect(onMeasurementUpdate).toHaveBeenCalledWith('lateral-cobb-4', {
    lowerVertebra: 'S1',
  });
});

it('keeps measurement and keypoint tabs outside the scrollable results content', () => {
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

  const scrollContent = screen.getByTestId('measurement-results-scroll-content');

  expect(scrollContent.contains(screen.getByRole('button', { name: '测量项' }))).toBe(
    false
  );
  expect(scrollContent.contains(screen.getByRole('button', { name: '检测点' }))).toBe(
    false
  );
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

it('syncs a completed lateral Cobb measurement to the detection layer from the measurement list', () => {
  const onCobbKeypointsSync = jest.fn();
  renderPanel(
    [
      {
        id: 'lateral-cobb-1',
        type: 'lateral-cobb1',
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

  expect(onCobbKeypointsSync).toHaveBeenCalledWith('lateral-cobb-1');
});

it('blocks editing lateral Cobb endpoints when they match a named lateral Cobb measurement', () => {
  const onMeasurementUpdate = jest.fn();
  renderPanel(
    [
      {
        id: 'lateral-cobb-1',
        type: 'lateral-cobb1',
        value: '18.20°',
        points: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        upperVertebra: 'T2',
        lowerVertebra: null,
      },
    ],
    jest.fn(),
    {
      examType: '侧位X光片',
      onMeasurementUpdate,
    }
  );

  fireEvent.click(screen.getByRole('button', { name: '下端椎待定' }));
  const listbox = screen.getByRole('listbox', { name: '选择下端椎' });
  fireEvent.click(within(listbox).getByRole('option', { name: 'T5' }));

  expect(screen.getByText('TK T2-T5已存在!')).toBeTruthy();
  expect(screen.getByRole('button', { name: '知道了' })).toBeTruthy();
  expect(onMeasurementUpdate).not.toHaveBeenCalled();
});
