import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';
import type { ComponentProps } from 'react';

import AnnotationToolbar from './AnnotationToolbar';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  AnnotationSource,
} from '@/app/imaging/features/image-viewer/shared/types';
import type {
  KeypointSequenceSession,
  Tool,
} from '@/app/imaging/features/image-viewer/shared/types';

const tools: Tool[] = [
  {
    id: 'cobb',
    name: 'Cobb',
    icon: 'medical-cobb',
    description: 'Cobb角',
    pointsNeeded: 4,
  },
  {
    id: 'arrow',
    name: 'Arrow',
    icon: 'ri-arrow-right-line',
    description: '箭头',
    pointsNeeded: 2,
  },
];

const completeC7Keypoints: KeypointAnnotation[] = [1, 2, 3, 4].map(index => ({
  id: `C7-${index}`,
  point: { x: index * 10, y: index * 20 },
  source: AnnotationSource.AI,
  confidence: 0.9,
}));

const completeT1Keypoints: KeypointAnnotation[] = [1, 2, 3, 4].map(index => ({
  id: `T1-${index}`,
  point: { x: 100 + index * 10, y: 100 + index * 20 },
  source: AnnotationSource.AI,
  confidence: 0.9,
}));

const completeT2Keypoints: KeypointAnnotation[] = [1, 2, 3, 4].map(index => ({
  id: `T2-${index}`,
  point: { x: 120 + index * 10, y: 120 + index * 20 },
  source: AnnotationSource.AI,
  confidence: 0.9,
}));

const completeT3Keypoints: KeypointAnnotation[] = [1, 2, 3, 4].map(index => ({
  id: `T3-${index}`,
  point: { x: 140 + index * 10, y: 140 + index * 20 },
  source: AnnotationSource.AI,
  confidence: 0.9,
}));

const completeT5Keypoints: KeypointAnnotation[] = [1, 2, 3, 4].map(index => ({
  id: `T5-${index}`,
  point: { x: 160 + index * 10, y: 160 + index * 20 },
  source: AnnotationSource.AI,
  confidence: 0.9,
}));

const completeT8Keypoints: KeypointAnnotation[] = [1, 2, 3, 4].map(index => ({
  id: `T8-${index}`,
  point: { x: 180 + index * 10, y: 180 + index * 20 },
  source: AnnotationSource.AI,
  confidence: 0.9,
}));

const completeC2Keypoints: KeypointAnnotation[] = [1, 2, 3, 4].map(index => ({
  id: `C2-${index}`,
  point: { x: 200 + index * 10, y: 200 + index * 20 },
  source: AnnotationSource.AI,
  confidence: 0.9,
}));

const completeC3Keypoints: KeypointAnnotation[] = [1, 2, 3, 4].map(index => ({
  id: `C3-${index}`,
  point: { x: 220 + index * 10, y: 220 + index * 20 },
  source: AnnotationSource.AI,
  confidence: 0.9,
}));

const completeC6Keypoints: KeypointAnnotation[] = [1, 2, 3, 4].map(index => ({
  id: `C6-${index}`,
  point: { x: 240 + index * 10, y: 240 + index * 20 },
  source: AnnotationSource.AI,
  confidence: 0.9,
}));

const lateralS1Keypoints: KeypointAnnotation[] = [1, 2].map(index => ({
  id: `S1-${index}`,
  point: { x: 300 + index * 10, y: 300 + index * 20 },
  source: AnnotationSource.AI,
  confidence: 0.9,
}));

type AnnotationToolbarProps = ComponentProps<typeof AnnotationToolbar>;

function createBaseToolbarProps(): AnnotationToolbarProps {
  return {
    examType: '正位X光片',
    tools,
    measurements: [],
    keypoints: [],
    completeVertebraGroups: [],
    canUseKeypointTools: true,
    selectedTool: 'hand',
    isSettingStandardDistance: false,
    standardDistance: null,
    standardDistancePointsLength: 0,
    standardDistanceValue: '',
    reportText: '',
    saveMessage: '',
    pointBindings: { syncGroups: [] },
    selectedBindingGroupId: null,
    isBindingPanelOpen: false,
    isManualBindingMode: false,
    manualBindingSelectedPointsCount: 0,
    showTagPanel: false,
    tags: [],
    newTag: '',
    showAdvicePanel: false,
    treatmentAdvice: '',
    automaticToolStatus: {},
    keypointSequenceSession: null,
    keypointSequenceClosedGroupName: null,
    onSelectTool: jest.fn(),
    onStartKeypointSequence: jest.fn(),
    onCancelKeypointSequence: jest.fn(),
    onRestoreAutomaticMeasurement: jest.fn(),
    onCreateAvt: jest.fn(),
    onCreateVertebraCenter: jest.fn(),
    onCreateCobb: jest.fn(),
    onActivateHandMode: jest.fn(),
    onToggleImagePanLocked: jest.fn(),
    isImagePanLocked: false,
    onToggleBindingPanel: jest.fn(),
    onClearBindings: jest.fn(),
    onStartManualBinding: jest.fn(),
    onCompleteManualBinding: jest.fn(),
    onCancelManualBinding: jest.fn(),
    onSelectBindingGroup: jest.fn(),
    onRemoveBindingGroup: jest.fn(),
    onRemoveBindingMember: jest.fn(),
    onStartStandardDistance: jest.fn(),
    onChangeStandardDistanceValue: jest.fn(),
    onStandardDistanceInputBlur: jest.fn(),
    onStandardDistanceInputEnter: jest.fn(),
    onToggleTagPanel: jest.fn(),
    onChangeNewTag: jest.fn(),
    onAddTag: jest.fn(),
    onRemoveTag: jest.fn(),
    onToggleAdvicePanel: jest.fn(),
    onChangeTreatmentAdvice: jest.fn(),
    onCopyReport: jest.fn(),
    onRectifyVertebraCornerOrder: jest.fn(),
    onApplyVertebraLabelOffset: jest.fn(),
  };
}

function renderToolbar(overrides: Partial<AnnotationToolbarProps> = {}) {
  const props = {
    ...createBaseToolbarProps(),
    ...overrides,
  };

  return {
    ...render(<AnnotationToolbar {...props} />),
    props,
  };
}

it('renders anterior basic modes and keeps the default manual annotation content', () => {
  renderToolbar();

  expect(screen.getByRole('button', { name: '手动标注' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '椎体点位纠正' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '测量项派生' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '测量工具' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '关键点' })).toBeTruthy();
  expect(screen.getByText('测量标注')).toBeTruthy();
  expect(screen.getByText('辅助图形')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Arrow/ })).toBeTruthy();
});

it('selects a measurement tool when it is not already active', () => {
  const onSelectTool = jest.fn();
  const onActivateHandMode = jest.fn();
  renderToolbar({ onSelectTool, onActivateHandMode });

  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));

  expect(onSelectTool).toHaveBeenCalledWith('cobb');
  expect(onActivateHandMode).not.toHaveBeenCalled();
});

it('returns to hand mode when clicking the active measurement tool again', () => {
  const onSelectTool = jest.fn();
  const onActivateHandMode = jest.fn();
  renderToolbar({
    selectedTool: 'cobb',
    onSelectTool,
    onActivateHandMode,
  });

  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));

  expect(onActivateHandMode).toHaveBeenCalled();
  expect(onSelectTool).not.toHaveBeenCalled();
});

it('returns to hand mode when clicking the active auxiliary tool again', () => {
  const onSelectTool = jest.fn();
  const onActivateHandMode = jest.fn();
  renderToolbar({
    selectedTool: 'arrow',
    onSelectTool,
    onActivateHandMode,
  });

  fireEvent.click(screen.getByRole('button', { name: /Arrow/ }));

  expect(onActivateHandMode).toHaveBeenCalled();
  expect(onSelectTool).not.toHaveBeenCalled();
});

it('keeps the keypoint chooser open after selecting a manual keypoint', () => {
  const onSelectTool = jest.fn();
  const onCancelKeypointSequence = jest.fn();
  renderToolbar({ onSelectTool, onCancelKeypointSequence });

  fireEvent.click(screen.getByRole('button', { name: '关键点' }));
  fireEvent.click(screen.getByRole('button', { name: /^C7 0$/ }));
  fireEvent.click(screen.getByRole('button', { name: 'C7-1' }));

  expect(onCancelKeypointSequence).toHaveBeenCalled();
  expect(onSelectTool).toHaveBeenCalledWith('keypoint:C7-1');
  expect(screen.getByRole('button', { name: 'C7-2' })).toBeTruthy();
});

it('starts a sequential missing-keypoint session when an incomplete vertebra group is selected', () => {
  const onStartKeypointSequence = jest.fn();
  renderToolbar({ onStartKeypointSequence });

  fireEvent.click(screen.getByRole('button', { name: '关键点' }));
  fireEvent.click(screen.getByRole('button', { name: /^L5 0$/ }));

  expect(onStartKeypointSequence).toHaveBeenCalledWith('L5', [
    'L5-1',
    'L5-2',
    'L5-3',
    'L5-4',
  ]);
  expect(screen.getByRole('button', { name: 'L5-1' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'L5-4' })).toBeTruthy();
});

it('starts a sequential keypoint session with only missing keypoints', () => {
  const onStartKeypointSequence = jest.fn();
  renderToolbar({
    keypoints: completeT5Keypoints.slice(0, 2),
    onStartKeypointSequence,
  });

  fireEvent.click(screen.getByRole('button', { name: '关键点' }));
  fireEvent.click(screen.getByRole('button', { name: /^T5 2$/ }));

  expect(onStartKeypointSequence).toHaveBeenCalledWith('T5', [
    'T5-3',
    'T5-4',
  ]);
});

it('does not start sequential placement for non-vertebra keypoint groups', () => {
  const onStartKeypointSequence = jest.fn();
  renderToolbar({ onStartKeypointSequence });

  fireEvent.click(screen.getByRole('button', { name: '关键点' }));
  fireEvent.click(screen.getByRole('button', { name: /^姿态点 0$/ }));

  expect(onStartKeypointSequence).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'IL' })).toBeTruthy();
});

it('starts a sequential missing-keypoint session for lateral S1', () => {
  const onStartKeypointSequence = jest.fn();
  renderToolbar({
    examType: '侧位X光片',
    onStartKeypointSequence,
  });

  fireEvent.click(screen.getByRole('button', { name: '关键点' }));
  fireEvent.click(screen.getByRole('button', { name: /^S1 0$/ }));

  expect(onStartKeypointSequence).toHaveBeenCalledWith('S1', [
    'S1-1',
    'S1-2',
  ]);
  expect(screen.getByRole('button', { name: 'S1-1' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'S1-2' })).toBeTruthy();
});

it('starts a sequential missing-keypoint session for lateral C3-C6 vertebrae', () => {
  const onStartKeypointSequence = jest.fn();
  renderToolbar({
    examType: '侧位X光片',
    onStartKeypointSequence,
  });

  fireEvent.click(screen.getByRole('button', { name: '关键点' }));
  expect(screen.queryByRole('button', { name: /^C3 0$/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^C6 0$/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /^C3 0$/ }));

  expect(onStartKeypointSequence).toHaveBeenCalledWith('C3', [
    'C3-1',
    'C3-2',
    'C3-3',
    'C3-4',
  ]);
  expect(screen.getByRole('button', { name: 'C3-1' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'C3-4' })).toBeTruthy();
});

it('does not start sequential placement for lateral CFH', () => {
  const onStartKeypointSequence = jest.fn();
  renderToolbar({
    examType: '侧位X光片',
    onStartKeypointSequence,
  });

  fireEvent.click(screen.getByRole('button', { name: '关键点' }));
  fireEvent.click(screen.getByRole('button', { name: /^CFH 0$/ }));

  expect(onStartKeypointSequence).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'CFH' })).toBeTruthy();
});

it('highlights the keypoint group during sequential keypoint placement', () => {
  const keypointSequenceSession: KeypointSequenceSession = {
    groupName: 'L5',
    keypointIds: ['L5-1', 'L5-2', 'L5-3', 'L5-4'],
    currentIndex: 1,
  };
  renderToolbar({ keypointSequenceSession });

  fireEvent.click(screen.getByRole('button', { name: '关键点' }));

  expect(
    screen.getByRole('button', { name: /^L5 0$/ }).getAttribute('aria-pressed')
  ).toBe('true');
});

it('unselects a keypoint group after sequential keypoint placement completes', () => {
  const { rerender } = renderToolbar();

  fireEvent.click(screen.getByRole('button', { name: '关键点' }));
  fireEvent.click(screen.getByRole('button', { name: /^L5 0$/ }));

  expect(
    screen.getByRole('button', { name: /^L5 0$/ }).getAttribute('aria-pressed')
  ).toBe('true');
  expect(screen.getByRole('button', { name: 'L5-1' })).toBeTruthy();

  rerender(
    <AnnotationToolbar
      {...createBaseToolbarProps()}
      keypointSequenceClosedGroupName="L5"
    />
  );

  expect(
    screen.getByRole('button', { name: /^L5 0$/ }).getAttribute('aria-pressed')
  ).toBe('false');
  expect(screen.queryByRole('button', { name: 'L5-1' })).toBeNull();
});

it('shows measurement derive mode for lateral annotation', () => {
  renderToolbar({ examType: '侧位X光片' });

  expect(screen.getByRole('button', { name: '手动标注' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '椎体点位纠正' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '测量项派生' })).toBeTruthy();
});

it('shows only keypoints when the vertebra corner rectify mode is selected', () => {
  const { props } = renderToolbar();

  fireEvent.click(screen.getByRole('button', { name: '椎体点位纠正' }));

  expect(props.onActivateHandMode).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: '测量工具' })).toBeNull();
  expect(screen.getByRole('button', { name: '椎体内纠正' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '椎体序号偏移纠正' })).toBeTruthy();
  expect(screen.queryByText('测量标注')).toBeNull();
  expect(screen.queryByText('辅助图形')).toBeNull();
  expect(screen.getByText('C7')).toBeTruthy();
});

it('validates required vertebra selections before applying label offset rectification', () => {
  const onApplyVertebraLabelOffset = jest.fn();
  renderToolbar({ onApplyVertebraLabelOffset });

  fireEvent.click(screen.getByRole('button', { name: '椎体点位纠正' }));
  fireEvent.click(screen.getByRole('button', { name: '椎体序号偏移纠正' }));
  fireEvent.click(screen.getByRole('button', { name: '应用纠正' }));

  expect(screen.getByText('请选择起始椎体、结束椎体')).toBeTruthy();
  expect(onApplyVertebraLabelOffset).not.toHaveBeenCalled();
});

it('applies vertebra label offset rectification with selected range and offset', () => {
  const onApplyVertebraLabelOffset = jest.fn();
  renderToolbar({ onApplyVertebraLabelOffset });

  fireEvent.click(screen.getByRole('button', { name: '椎体点位纠正' }));
  fireEvent.click(screen.getByRole('button', { name: '椎体序号偏移纠正' }));
  fireEvent.change(screen.getByLabelText('起始椎体'), {
    target: { value: 'T1' },
  });
  fireEvent.change(screen.getByLabelText('结束椎体'), {
    target: { value: 'T3' },
  });
  fireEvent.change(screen.getByLabelText('偏移方向'), {
    target: { value: 'down' },
  });
  fireEvent.change(screen.getByLabelText('偏移量'), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用纠正' }));

  expect(onApplyVertebraLabelOffset).toHaveBeenCalledWith({
    startVertebra: 'T1',
    endVertebra: 'T3',
    direction: 'down',
    offset: 2,
  });
});

it('shows only Cobb without auxiliary shapes in anterior measurement derive mode', () => {
  renderToolbar();

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));

  expect(screen.getByRole('button', { name: '测量工具' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '关键点' })).toBeNull();
  expect(screen.getByText('测量标注')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Cobb/ })).toBeTruthy();
  expect(screen.queryByText('辅助图形')).toBeNull();
  expect(screen.queryByRole('button', { name: /Arrow/ })).toBeNull();
});

it('shows only Cobb without auxiliary shapes in lateral measurement derive mode', () => {
  renderToolbar({
    examType: '侧位X光片',
    tools: [tools[1]],
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));

  expect(screen.getByRole('button', { name: '测量工具' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '关键点' })).toBeNull();
  expect(screen.getByText('测量标注')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Cobb/ })).toBeTruthy();
  expect(screen.queryByText('辅助图形')).toBeNull();
  expect(screen.queryByRole('button', { name: /Arrow/ })).toBeNull();
});

it('keeps Cobb derivation panel behavior even when Cobb is the active tool', () => {
  const onActivateHandMode = jest.fn();
  renderToolbar({
    selectedTool: 'cobb',
    keypoints: [...completeC7Keypoints, ...completeT1Keypoints],
    completeVertebraGroups: ['C7', 'T1'],
    onActivateHandMode,
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  onActivateHandMode.mockClear();
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));

  expect(screen.getByText('派生Cobb')).toBeTruthy();
  expect(onActivateHandMode).not.toHaveBeenCalled();
});

it('derives Cobb from selected complete endpoint vertebrae', () => {
  const onCreateCobb = jest.fn();
  renderToolbar({
    keypoints: [...completeC7Keypoints, ...completeT1Keypoints],
    completeVertebraGroups: ['C7', 'T1'],
    onCreateCobb,
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));

  expect(screen.getByText('派生Cobb')).toBeTruthy();
  expect((screen.getByLabelText('上端椎') as HTMLSelectElement).value).toBe(
    'C7'
  );
  expect((screen.getByLabelText('下端椎') as HTMLSelectElement).value).toBe(
    'T1'
  );

  fireEvent.click(screen.getByRole('button', { name: '应用派生' }));

  expect(onCreateCobb).toHaveBeenCalledWith('C7', 'T1');
});

it('disables the selected lower endpoint in AP Cobb derive upper options', () => {
  renderToolbar({
    keypoints: [...completeC7Keypoints, ...completeT1Keypoints],
    completeVertebraGroups: ['C7', 'T1'],
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));

  const upperSelect = screen.getByLabelText('上端椎') as HTMLSelectElement;
  const lowerSelect = screen.getByLabelText('下端椎') as HTMLSelectElement;
  const selectedLowerOptionInUpper = Array.from(upperSelect.options).find(
    option => option.value === lowerSelect.value
  );

  expect(selectedLowerOptionInUpper?.disabled).toBe(true);
});

it('derives lateral Cobb from available endpoint vertebrae including S1 two-point endplate', () => {
  const onCreateCobb = jest.fn();
  renderToolbar({
    examType: '侧位X光片',
    keypoints: [
      ...completeC2Keypoints,
      ...completeC7Keypoints,
      ...lateralS1Keypoints,
    ],
    completeVertebraGroups: ['C7'],
    onCreateCobb,
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));

  expect(screen.getByText('派生Cobb')).toBeTruthy();
  expect((screen.getByLabelText('上端椎') as HTMLSelectElement).value).toBe(
    'C2'
  );
  expect((screen.getByLabelText('下端椎') as HTMLSelectElement).value).toBe(
    'C7'
  );
  expect(
    Array.from(
      (screen.getByLabelText('下端椎') as HTMLSelectElement).options
    ).map(option => option.value)
  ).toContain('S1');
  fireEvent.change(screen.getByLabelText('下端椎'), {
    target: { value: 'S1' },
  });

  fireEvent.click(screen.getByRole('button', { name: '应用派生' }));

  expect(onCreateCobb).toHaveBeenCalledWith('C2', 'S1');
});

it('disables the selected lower endpoint in lateral Cobb derive upper options', () => {
  renderToolbar({
    examType: '侧位X光片',
    keypoints: [...completeC2Keypoints, ...completeC7Keypoints],
    completeVertebraGroups: ['C2', 'C7'],
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));

  const upperSelect = screen.getByLabelText('上端椎') as HTMLSelectElement;
  const lowerSelect = screen.getByLabelText('下端椎') as HTMLSelectElement;
  const selectedLowerOptionInUpper = Array.from(upperSelect.options).find(
    option => option.value === lowerSelect.value
  );

  expect(selectedLowerOptionInUpper?.disabled).toBe(true);
});

it('blocks lateral Cobb derivation when the selected endpoints match a named lateral Cobb measurement', () => {
  const onCreateCobb = jest.fn();
  renderToolbar({
    examType: '侧位X光片',
    keypoints: [...completeT2Keypoints, ...completeT5Keypoints],
    completeVertebraGroups: ['T2', 'T5'],
    onCreateCobb,
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));
  fireEvent.click(screen.getByRole('button', { name: '应用派生' }));

  expect(screen.getByText('TK T2-T5已存在!')).toBeTruthy();
  expect(screen.getByRole('button', { name: '知道了' })).toBeTruthy();
  expect(onCreateCobb).not.toHaveBeenCalled();
});

it('blocks C2-C7 lateral Cobb derivation because it matches C2-C7 CL', () => {
  const onCreateCobb = jest.fn();
  renderToolbar({
    examType: '侧位X光片',
    keypoints: [...completeC2Keypoints, ...completeC7Keypoints],
    completeVertebraGroups: ['C2', 'C7'],
    onCreateCobb,
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));
  fireEvent.click(screen.getByRole('button', { name: '应用派生' }));

  expect(screen.getByText('C2-C7 CL已存在!')).toBeTruthy();
  expect(onCreateCobb).not.toHaveBeenCalled();
});

it('still derives lateral Cobb when the selected endpoints do not match a named lateral Cobb measurement', () => {
  const onCreateCobb = jest.fn();
  renderToolbar({
    examType: '侧位X光片',
    keypoints: [...completeT3Keypoints, ...completeT8Keypoints],
    completeVertebraGroups: ['T3', 'T8'],
    onCreateCobb,
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));
  fireEvent.click(screen.getByRole('button', { name: '应用派生' }));

  expect(onCreateCobb).toHaveBeenCalledWith('T3', 'T8');
});

it('derives lateral Cobb from newly available cervical endpoint vertebrae', () => {
  const onCreateCobb = jest.fn();
  renderToolbar({
    examType: '侧位X光片',
    keypoints: [...completeC3Keypoints, ...completeC6Keypoints],
    completeVertebraGroups: ['C3', 'C6'],
    onCreateCobb,
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));

  expect((screen.getByLabelText('上端椎') as HTMLSelectElement).value).toBe(
    'C3'
  );
  expect((screen.getByLabelText('下端椎') as HTMLSelectElement).value).toBe(
    'C6'
  );

  fireEvent.click(screen.getByRole('button', { name: '应用派生' }));

  expect(onCreateCobb).toHaveBeenCalledWith('C3', 'C6');
});

it('shows an overlay when lateral Cobb endpoint order is invalid', () => {
  const onCreateCobb = jest.fn();
  renderToolbar({
    examType: '侧位X光片',
    keypoints: [...completeC7Keypoints, ...completeT1Keypoints],
    completeVertebraGroups: ['C7', 'T1'],
    onCreateCobb,
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));
  fireEvent.change(screen.getByLabelText('上端椎'), {
    target: { value: 'T1' },
  });
  fireEvent.change(screen.getByLabelText('下端椎'), {
    target: { value: 'C7' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用派生' }));

  expect(
    screen.getByText('上端椎不应该比下端椎更靠下或与下端椎相同!')
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: '知道了' })).toBeTruthy();
  expect(onCreateCobb).not.toHaveBeenCalled();
});

it('shows an overlay when deriving a duplicate Cobb endpoint pair', () => {
  const onCreateCobb = jest.fn();
  renderToolbar({
    keypoints: [...completeC7Keypoints, ...completeT1Keypoints],
    completeVertebraGroups: ['C7', 'T1'],
    measurements: [
      {
        id: 'existing-cobb',
        type: 'cobb3',
        value: '12.00°',
        points: [],
        upperVertebra: 'C7',
        lowerVertebra: 'T1',
      },
    ],
    onCreateCobb,
  });

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));
  fireEvent.click(screen.getByRole('button', { name: /Cobb/ }));
  fireEvent.click(screen.getByRole('button', { name: '应用派生' }));

  expect(
    screen.getByText('CobbC7-T1已经存在, 不可重复派生!')
  ).toBeTruthy();
  expect(onCreateCobb).not.toHaveBeenCalled();
});

it('opens a corner order rectification panel only for complete vertebra groups', () => {
  renderToolbar({ keypoints: completeC7Keypoints });

  fireEvent.click(screen.getByRole('button', { name: '椎体点位纠正' }));

  const c7Button = screen.getByRole('button', { name: /^C7 4$/ });
  const t1Button = screen.getByRole('button', { name: /^T1 0$/ });
  expect(c7Button.hasAttribute('disabled')).toBe(false);
  expect(t1Button.hasAttribute('disabled')).toBe(true);
  expect(t1Button.getAttribute('title')).toBe('T1的四个关键点尚不完整!');

  fireEvent.click(screen.getByRole('button', { name: /^C7 4$/ }));

  expect(screen.getByText('纠正C7的序号')).toBeTruthy();
  expect(screen.getByText('C7-1')).toBeTruthy();
  expect(screen.getByText('C7-4')).toBeTruthy();
  expect(
    screen
      .getAllByRole('combobox')
      .map(select => (select as HTMLSelectElement).value)
  ).toEqual(['1', '2', '3', '4']);
});

it('hides anterior pose points in vertebra corner rectify mode', () => {
  renderToolbar();

  fireEvent.click(screen.getByRole('button', { name: '椎体点位纠正' }));

  expect(screen.getByRole('button', { name: /^C7 0$/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^姿态点/ })).toBeNull();
});

it('hides lateral sacral and anatomical points in vertebra corner rectify mode', () => {
  renderToolbar({ examType: '侧位X光片' });

  fireEvent.click(screen.getByRole('button', { name: '椎体点位纠正' }));

  expect(screen.getByRole('button', { name: /^C2 0$/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^S1/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /^CFH/ })).toBeNull();
});

it('validates and applies vertebra corner label-only rectification', () => {
  const onRectifyVertebraCornerOrder = jest.fn();

  renderToolbar({
    keypoints: completeC7Keypoints,
    onRectifyVertebraCornerOrder,
  });
  fireEvent.click(screen.getByRole('button', { name: '椎体点位纠正' }));
  fireEvent.click(screen.getByRole('button', { name: /^C7 4$/ }));

  const selects = screen.getAllByRole('combobox');
  fireEvent.change(selects[0], { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: '应用修改' }));

  expect(screen.getByText('椎体缺少序号1, 请检查您输入的序号!')).toBeTruthy();
  expect(screen.getByRole('button', { name: '知道了' })).toBeTruthy();
  expect(onRectifyVertebraCornerOrder).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '知道了' }));

  fireEvent.change(selects[0], { target: { value: '3' } });
  fireEvent.change(selects[2], { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: '应用修改' }));

  expect(onRectifyVertebraCornerOrder).toHaveBeenCalledWith('C7', [
    { from: 1, to: 3 },
    { from: 2, to: 2 },
    { from: 3, to: 1 },
    { from: 4, to: 4 },
  ]);
});
