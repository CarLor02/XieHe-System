import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';
import type { ComponentProps } from 'react';

import AnnotationToolbar from './AnnotationToolbar';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';
import {
  AnnotationSource,
} from '@/app/imaging/features/image-viewer/shared/types';
import type { Tool } from '@/app/imaging/features/image-viewer/shared/types';

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
    onSelectTool: jest.fn(),
    onRestoreAutomaticMeasurement: jest.fn(),
    onCreateAvt: jest.fn(),
    onCreateVertebraCenter: jest.fn(),
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

it('renders all basic modes and keeps the default Move tool content', () => {
  renderToolbar();

  expect(screen.getByRole('button', { name: '移动' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '椎体点位纠正' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '测量项派生' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '测量工具' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '关键点' })).toBeTruthy();
  expect(screen.getByText('测量标注')).toBeTruthy();
  expect(screen.getByText('辅助图形')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Arrow/ })).toBeTruthy();
});

it('shows only keypoints when the vertebra corner rectify mode is selected', () => {
  const { props } = renderToolbar();

  fireEvent.click(screen.getByRole('button', { name: '椎体点位纠正' }));

  expect(props.onActivateHandMode).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: '测量工具' })).toBeNull();
  expect(screen.getByRole('button', { name: '关键点' })).toBeTruthy();
  expect(screen.queryByText('测量标注')).toBeNull();
  expect(screen.queryByText('辅助图形')).toBeNull();
  expect(screen.getByText('C7')).toBeTruthy();
});

it('shows only measurement tools without auxiliary shapes in measurement derive mode', () => {
  renderToolbar();

  fireEvent.click(screen.getByRole('button', { name: '测量项派生' }));

  expect(screen.getByRole('button', { name: '测量工具' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '关键点' })).toBeNull();
  expect(screen.getByText('测量标注')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Cobb/ })).toBeTruthy();
  expect(screen.queryByText('辅助图形')).toBeNull();
  expect(screen.queryByRole('button', { name: /Arrow/ })).toBeNull();
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
  const alertSpy = jest
    .spyOn(window, 'alert')
    .mockImplementation(() => undefined);

  renderToolbar({
    keypoints: completeC7Keypoints,
    onRectifyVertebraCornerOrder,
  });
  fireEvent.click(screen.getByRole('button', { name: '椎体点位纠正' }));
  fireEvent.click(screen.getByRole('button', { name: /^C7 4$/ }));

  const selects = screen.getAllByRole('combobox');
  fireEvent.change(selects[0], { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: '应用修改' }));

  expect(alertSpy).toHaveBeenCalledWith(
    '椎体缺少序号1, 请检查您输入的序号!'
  );
  expect(onRectifyVertebraCornerOrder).not.toHaveBeenCalled();

  fireEvent.change(selects[0], { target: { value: '3' } });
  fireEvent.change(selects[2], { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: '应用修改' }));

  expect(onRectifyVertebraCornerOrder).toHaveBeenCalledWith('C7', [
    { from: 1, to: 3 },
    { from: 2, to: 2 },
    { from: 3, to: 1 },
    { from: 4, to: 4 },
  ]);

  alertSpy.mockRestore();
});
