import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import AnnotationToolbar from './AnnotationToolbar';
import { Tool } from '@/app/imaging/features/image-viewer/shared/types';

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

function renderToolbar() {
  const props = {
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
