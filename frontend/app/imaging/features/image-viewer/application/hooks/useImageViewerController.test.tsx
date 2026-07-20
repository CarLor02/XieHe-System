import { act, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';

const beginHistoryActionMock = jest.fn();
const clearHistoryMock = jest.fn();
const undoHistoryMock = jest.fn();
const redoHistoryMock = jest.fn();
const handleMeasurementDeleteMock = jest.fn();
const handleKeypointAddMock = jest.fn();
const handleKeypointDeleteMock = jest.fn();
const handleKeypointGroupDeleteMock = jest.fn();
const setMeasurementsMock = jest.fn();
const setShowVertebraeLayerMock = jest.fn();
const handleToggleVertebraeLayerMock = jest.fn();
const setSelectedToolMock = jest.fn();
const activateHandModeMock = jest.fn();
const handleApplyVertebraLabelOffsetMock = jest.fn();
const handleSaveMeasurementsMock = jest.fn();
let activeVertebraeLayerMock: Array<Record<string, unknown>> = [];
let annotationHistoryOptions:
  | {
      snapshot: Record<string, unknown>;
      restoreSnapshot: (snapshot: Record<string, unknown>) => void;
    }
  | null = null;

jest.mock('@/app/imaging/features/image-viewer/application/hooks/useAnnotationHistory', () => ({
  useAnnotationHistory: (
    options: {
      snapshot: Record<string, unknown>;
      restoreSnapshot: (snapshot: Record<string, unknown>) => void;
    }
  ) => {
    annotationHistoryOptions = options;
    return {
      beginHistoryAction: beginHistoryActionMock,
      clearHistory: clearHistoryMock,
      undo: undoHistoryMock,
      redo: redoHistoryMock,
      canUndo: true,
      canRedo: true,
    };
  },
}));

jest.mock('@/app/imaging/features/image-viewer/features/bindings', () => ({
  createEmptyBindings: () => ({ syncGroups: [] }),
  useAnnotationEngine: () => ({
    pointBindings: { syncGroups: [] },
    setPointBindings: jest.fn(),
    selectedBindingGroupId: null,
    setSelectedBindingGroupId: jest.fn(),
    isBindingPanelOpen: false,
    setIsBindingPanelOpen: jest.fn(),
    centerOnPoint: null,
    setCenterOnPoint: jest.fn(),
    isManualBindingMode: false,
    setIsManualBindingMode: jest.fn(),
    manualBindingSelectedPoints: [],
    setManualBindingSelectedPoints: jest.fn(),
    clearBindings: jest.fn(),
    removeBindingGroup: jest.fn(),
    removeBindingMember: jest.fn(),
    toggleManualBindingPoint: jest.fn(),
    completeManualBinding: jest.fn(),
    cancelManualBinding: jest.fn(),
  }),
}));

jest.mock('@/app/imaging/features/image-viewer/features/annotation-canvas', () => ({
  useCanvasInteraction: () => ({
    selectedTool: 'hand',
    setSelectedTool: setSelectedToolMock,
    handleToolChange: jest.fn(),
    activateHandMode: activateHandModeMock,
    clickedPoints: [],
    setClickedPoints: jest.fn(),
    isSettingStandardDistance: false,
    setIsSettingStandardDistance: jest.fn(),
    showStandardDistanceWarning: false,
    setShowStandardDistanceWarning: jest.fn(),
    isImagePanLocked: false,
    setIsImagePanLocked: jest.fn(),
  }),
}));

jest.mock('@/app/imaging/features/image-viewer/features/measurements/catalog/exam-tool-catalog', () => ({
  getToolsForExamType: () => [],
}));

jest.mock('@/app/imaging/features/image-viewer/features/measurements', () => ({
  useAnnotationPersistence: () => ({
    saveMessage: '',
    setSaveMessage: jest.fn(),
  }),
  useLocalAnnotationsDataLoader: jest.fn(),
  useMeasurementCalculation: () => ({
    calculationContext: {},
    calculateMeasurementValue: jest.fn(),
    getDescriptionForType: jest.fn(() => ''),
  }),
  useMeasurements: () => ({
    measurements: [
      {
        id: 'measurement-1',
        type: 'Cobb1',
        value: '10.00°',
        points: [{ x: 1, y: 1 }],
      },
    ],
    setMeasurements: setMeasurementsMock,
    reportText: '',
    setReportText: jest.fn(),
    standardDistance: null,
    setStandardDistance: jest.fn(),
    standardDistanceValue: '',
    setStandardDistanceValue: jest.fn(),
    standardDistancePoints: [],
    setStandardDistancePoints: jest.fn(),
    hoveredStandardPointIndex: null,
    setHoveredStandardPointIndex: jest.fn(),
    draggingStandardPointIndex: null,
    setDraggingStandardPointIndex: jest.fn(),
    tags: [],
    setTags: jest.fn(),
    newTag: '',
    setNewTag: jest.fn(),
    showTagPanel: false,
    setShowTagPanel: jest.fn(),
    treatmentAdvice: '',
    setTreatmentAdvice: jest.fn(),
    showAdvicePanel: false,
    setShowAdvicePanel: jest.fn(),
    recalculateAVTandTS: jest.fn(),
  }),
  useMeasurementWorkflow: () => ({
    handleAddMeasurement: jest.fn(),
    handleMeasurementDelete: handleMeasurementDeleteMock,
    automaticToolStatus: {},
    handleRestoreAutomaticMeasurement: jest.fn(),
  }),
  useStandardDistanceActions: () => ({
    handleSelectTool: jest.fn(),
    handleStartStandardDistance: jest.fn(),
    handleStandardDistanceInputBlur: jest.fn(),
    handleStandardDistanceInputEnter: jest.fn(),
  }),
}));

jest.mock('@/app/imaging/features/image-viewer/features/study', () => ({
  canUseKeypointTools: () => true,
  useImageListFetcher: jest.fn(),
  useImageStudy: () => ({
    studyData: {
      patient_name: 'patient',
      patient_id: 1,
      patient_identifier: 'P2026001',
      patient_gender: 'MALE',
      patient_age: 41,
      study_description: '正位X光片',
      modality: 'DX',
      study_date: '2026-06-08',
      created_at: '2026-06-08T00:00:00Z',
    },
    setStudyData: jest.fn(),
    studyLoading: false,
    setStudyLoading: jest.fn(),
    imageList: [],
    setImageList: jest.fn(),
    imageNaturalSize: { width: 100, height: 100 },
    setImageNaturalSize: jest.fn(),
  }),
  useStudyDataLoader: jest.fn(),
  useStudyHeaderActions: () => ({
    isSaving: false,
    isAIDetecting: false,
    isAIMeasuring: false,
    handleAIMeasurement: jest.fn(),
    handleSaveMeasurements: handleSaveMeasurementsMock,
  }),
}));

jest.mock('@/app/imaging/features/image-viewer/features/report', () => ({
  useReportActions: () => ({
    handleReportGenerate: jest.fn(),
    handleCopyReport: jest.fn(),
  }),
}));

jest.mock('@/app/imaging/features/image-viewer/features/keypoints', () => ({
  isAnteriorExamType: () => true,
  isKeypointSupportedExamType: () => true,
  isLateralExamType: () => false,
  useKeypointMeasurementWorkflow: () => ({
    vertebraeLayer: [],
    setVertebraeLayer: jest.fn(),
    keypoints: [
      {
        id: 'T1-1',
        point: { x: 1, y: 1 },
        source: 'manual',
        confidence: 1,
      },
    ],
    setKeypoints: jest.fn(),
    cfhAnnotation: null,
    setCfhAnnotation: jest.fn(),
    showVertebraeLayer: true,
    setShowVertebraeLayer: setShowVertebraeLayerMock,
    activeVertebraeLayer: activeVertebraeLayerMock,
    completeVertebraGroups: [],
    aiMeasurementIdsRef: { current: new Set() },
    lateralDetectionResultRef: { current: null },
    deriveInitialMeasurementsFromKeypoints: jest.fn(),
    deriveKeypointMeasurements: jest.fn(),
    recalculateExistingMeasurements: jest.fn(),
    syncUniqueMeasurements: jest.fn(previous => previous),
    clearKeypointState: jest.fn(),
    restoreAiMeasurementIds: jest.fn(),
    getAiMeasurementIdsSnapshot: jest.fn(() => []),
    handleKeypointAdd: handleKeypointAddMock,
    handleKeypointDelete: handleKeypointDeleteMock,
    handleKeypointGroupDelete: handleKeypointGroupDeleteMock,
    handleCreateVertebraCenter: jest.fn(),
    handleCreateCobb: jest.fn(),
    handleRectifyVertebraCornerOrder: jest.fn(),
    handleApplyVertebraLabelOffset: handleApplyVertebraLabelOffsetMock,
    handleCreateTts: jest.fn(),
    handleCreateAvt: jest.fn(),
    handleVertebraeUpdate: jest.fn(),
    handleVertebraePreviewUpdate: jest.fn(),
    handleMeasurementWriteback: jest.fn(),
    handleCobbKeypointsSync: jest.fn(),
    handleToggleVertebraeLayer: handleToggleVertebraeLayerMock,
  }),
}));

const { useImageViewerController } = jest.requireActual<
  typeof import('./useImageViewerController')
>('./useImageViewerController');

type Controller = ReturnType<typeof useImageViewerController>;

function ControllerHarness({
  onValue,
}: {
  onValue: (value: Controller) => void;
}) {
  const value = useImageViewerController({ imageId: 'image-1' });

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return null;
}

beforeEach(() => {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: 'Win32',
  });
  beginHistoryActionMock.mockClear();
  clearHistoryMock.mockClear();
  undoHistoryMock.mockClear();
  redoHistoryMock.mockClear();
  handleMeasurementDeleteMock.mockClear();
  handleKeypointAddMock.mockClear();
  handleKeypointDeleteMock.mockClear();
  handleKeypointGroupDeleteMock.mockClear();
  setMeasurementsMock.mockClear();
  setShowVertebraeLayerMock.mockClear();
  handleToggleVertebraeLayerMock.mockClear();
  setSelectedToolMock.mockClear();
  activateHandModeMock.mockClear();
  handleApplyVertebraLabelOffsetMock.mockClear();
  handleSaveMeasurementsMock.mockClear();
  activeVertebraeLayerMock = [];
  annotationHistoryOptions = null;
});

afterEach(() => {
  jest.useRealTimers();
});

it('keeps the database patient id separate from header demographics', async () => {
  let latest: Controller | null = null;

  render(<ControllerHarness onValue={value => (latest = value)} />);

  await waitFor(() => expect(latest).not.toBeNull());

  expect(latest!.headerProps.imageData).toMatchObject({
    patientId: '1',
    patientIdentifier: 'P2026001',
    patientGender: 'MALE',
    patientAge: 41,
  });
});

it('starts annotation history before deleting a measurement from the results list', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  latest!.canvasProps.onMeasurementDelete?.('measurement-1');

  expect(beginHistoryActionMock).toHaveBeenCalledWith('measurement-delete');
  expect(handleMeasurementDeleteMock).toHaveBeenCalledWith('measurement-1');
});

it('starts annotation history before updating a measurement from the results list', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const onMeasurementUpdate = (
    latest!.canvasProps as {
      onMeasurementUpdate?: (
        measurementId: string,
        updates: Record<string, unknown>
      ) => void;
    }
  ).onMeasurementUpdate;

  expect(onMeasurementUpdate).toBeDefined();
  onMeasurementUpdate?.('measurement-1', { upperVertebra: 'T1' });

  expect(beginHistoryActionMock).toHaveBeenCalledWith('measurement-update');
  expect(setMeasurementsMock).toHaveBeenCalledWith(expect.any(Function));
});

it('starts annotation history before clearing all annotations', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  latest!.canvasProps.onClearAll();

  expect(beginHistoryActionMock).toHaveBeenCalledWith(
    'clear-all',
    expect.objectContaining({
      commitImmediately: true,
      snapshot: annotationHistoryOptions!.snapshot,
    })
  );
  expect(setMeasurementsMock).toHaveBeenCalledWith([]);
});

it('starts annotation history before deleting a keypoint from the results list', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  latest!.canvasProps.onKeypointDelete?.('T1-1');

  expect(beginHistoryActionMock).toHaveBeenCalledWith('keypoint-delete');
  expect(handleKeypointDeleteMock).toHaveBeenCalledWith('T1-1');
});

it('starts annotation history before deleting a selected vertebra group', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  latest!.canvasProps.onKeypointGroupDelete?.('T1');

  expect(beginHistoryActionMock).toHaveBeenCalledWith('keypoint-group-delete');
  expect(handleKeypointGroupDeleteMock).toHaveBeenCalledWith('T1');
});

it('starts annotation history before applying vertebra label offset rectification', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const options = {
    startVertebra: 'T1',
    endVertebra: 'T3',
    direction: 'down' as const,
    offset: 1,
  };
  latest!.toolbarProps.onApplyVertebraLabelOffset(options);

  expect(beginHistoryActionMock).toHaveBeenCalledWith(
    'vertebra-label-offset-rectify'
  );
  expect(handleApplyVertebraLabelOffsetMock).toHaveBeenCalledWith(options);
});

it('does not include detection-layer visibility in annotation history', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
    expect(annotationHistoryOptions).not.toBeNull();
  });

  expect(annotationHistoryOptions!.snapshot).not.toHaveProperty(
    'showVertebraeLayer'
  );

  annotationHistoryOptions!.restoreSnapshot({
    measurements: [],
    standardDistance: null,
    standardDistanceValue: '',
    standardDistancePoints: [],
    pointBindings: { syncGroups: [] },
    keypoints: [],
    vertebraeLayer: [],
    cfhAnnotation: null,
    aiMeasurementIds: [],
    showVertebraeLayer: false,
  });

  expect(setShowVertebraeLayerMock).not.toHaveBeenCalled();
});

it('undoes annotation history from Ctrl+Z', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const event = new KeyboardEvent('keydown', {
    key: 'z',
    ctrlKey: true,
    bubbles: true,
  });
  const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

  document.dispatchEvent(event);

  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  expect(undoHistoryMock).toHaveBeenCalledTimes(1);
  expect(redoHistoryMock).not.toHaveBeenCalled();
});

it('redoes annotation history from Ctrl+Y', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const event = new KeyboardEvent('keydown', {
    key: 'y',
    ctrlKey: true,
    bubbles: true,
  });
  const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

  document.dispatchEvent(event);

  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  expect(redoHistoryMock).toHaveBeenCalledTimes(1);
  expect(undoHistoryMock).not.toHaveBeenCalled();
});

it('saves annotations from Ctrl+S', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const event = new KeyboardEvent('keydown', {
    key: 's',
    ctrlKey: true,
    bubbles: true,
  });
  const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

  document.dispatchEvent(event);

  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  expect(handleSaveMeasurementsMock).toHaveBeenCalledTimes(1);
});

it('undoes annotation history from Command+Z on Mac', async () => {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: 'MacIntel',
  });
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const event = new KeyboardEvent('keydown', {
    key: 'z',
    metaKey: true,
    bubbles: true,
  });
  const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

  document.dispatchEvent(event);

  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  expect(undoHistoryMock).toHaveBeenCalledTimes(1);
  expect(redoHistoryMock).not.toHaveBeenCalled();
});

it('redoes annotation history from Command+Y on Mac', async () => {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: 'MacIntel',
  });
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const event = new KeyboardEvent('keydown', {
    key: 'y',
    metaKey: true,
    bubbles: true,
  });
  const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

  document.dispatchEvent(event);

  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  expect(redoHistoryMock).toHaveBeenCalledTimes(1);
  expect(undoHistoryMock).not.toHaveBeenCalled();
});

it('saves annotations from Command+S on Mac', async () => {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: 'MacIntel',
  });
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const event = new KeyboardEvent('keydown', {
    key: 's',
    metaKey: true,
    bubbles: true,
  });
  const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

  document.dispatchEvent(event);

  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  expect(handleSaveMeasurementsMock).toHaveBeenCalledTimes(1);
});

it('does not use Ctrl+Z for annotation history on Mac', async () => {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: 'MacIntel',
  });
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const event = new KeyboardEvent('keydown', {
    key: 'z',
    ctrlKey: true,
    bubbles: true,
  });
  const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

  document.dispatchEvent(event);

  expect(preventDefaultSpy).not.toHaveBeenCalled();
  expect(undoHistoryMock).not.toHaveBeenCalled();
  expect(redoHistoryMock).not.toHaveBeenCalled();
});

it('does not save annotations from Ctrl+S on Mac', async () => {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: 'MacIntel',
  });
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const event = new KeyboardEvent('keydown', {
    key: 's',
    ctrlKey: true,
    bubbles: true,
  });
  const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

  document.dispatchEvent(event);

  expect(preventDefaultSpy).not.toHaveBeenCalled();
  expect(handleSaveMeasurementsMock).not.toHaveBeenCalled();
});

it('does not use annotation history shortcuts inside editable fields', async () => {
  let latest: Controller | null = null;
  const input = document.createElement('input');
  document.body.appendChild(input);

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    })
  );

  expect(undoHistoryMock).not.toHaveBeenCalled();
  expect(redoHistoryMock).not.toHaveBeenCalled();

  input.remove();
});

it('does not save annotations from Ctrl+S inside editable fields', async () => {
  let latest: Controller | null = null;
  const input = document.createElement('input');
  document.body.appendChild(input);

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    })
  );

  expect(handleSaveMeasurementsMock).not.toHaveBeenCalled();

  input.remove();
});

it('debounces annotation saves from button and shortcut within 500ms', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(0);
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  latest!.headerProps.onSave();
  latest!.headerProps.onSave();

  expect(handleSaveMeasurementsMock).toHaveBeenCalledTimes(1);

  jest.advanceTimersByTime(499);
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    })
  );

  expect(handleSaveMeasurementsMock).toHaveBeenCalledTimes(1);

  jest.advanceTimersByTime(1);
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    })
  );

  expect(handleSaveMeasurementsMock).toHaveBeenCalledTimes(2);
});

it('toggles the detection layer from Shift+D when layer data exists', async () => {
  activeVertebraeLayerMock = [
    {
      label: 'T1',
      corners: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
    },
  ];
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  const event = new KeyboardEvent('keydown', {
    key: 'D',
    shiftKey: true,
    bubbles: true,
  });
  const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

  document.dispatchEvent(event);

  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  expect(handleToggleVertebraeLayerMock).toHaveBeenCalledTimes(1);
});

it('does not toggle the detection layer from Shift+D inside editable fields', async () => {
  activeVertebraeLayerMock = [
    {
      label: 'T1',
      corners: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
    },
  ];
  let latest: Controller | null = null;
  const input = document.createElement('input');
  document.body.appendChild(input);

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'd',
      shiftKey: true,
      bubbles: true,
    })
  );

  expect(handleToggleVertebraeLayerMock).not.toHaveBeenCalled();

  input.remove();
});

it('adds sequential keypoints with one history entry per point', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.toolbarProps.onStartKeypointSequence('L5', ['L5-1', 'L5-2']);
  });

  await waitFor(() => {
    expect(latest!.canvasProps.keypointSequenceSession?.currentIndex).toBe(0);
  });
  activateHandModeMock.mockClear();

  act(() => {
    latest!.canvasProps.onSequenceKeypointAdd({ x: 10, y: 20 });
  });

  await waitFor(() => {
    expect(latest!.canvasProps.keypointSequenceSession?.currentIndex).toBe(1);
  });

  act(() => {
    latest!.canvasProps.onSequenceKeypointAdd({ x: 30, y: 40 });
  });

  await waitFor(() => {
    expect(latest!.canvasProps.keypointSequenceSession).toBeNull();
    expect(latest!.toolbarProps.keypointSequenceClosedGroupName).toBe('L5');
  });

  expect(beginHistoryActionMock).toHaveBeenCalledTimes(2);
  expect(beginHistoryActionMock).toHaveBeenNthCalledWith(1, 'manual-keypoint');
  expect(beginHistoryActionMock).toHaveBeenNthCalledWith(2, 'manual-keypoint');
  expect(handleKeypointAddMock).toHaveBeenNthCalledWith(1, 'L5-1', {
    x: 10,
    y: 20,
  });
  expect(handleKeypointAddMock).toHaveBeenNthCalledWith(2, 'L5-2', {
    x: 30,
    y: 40,
  });
  expect(activateHandModeMock).toHaveBeenCalledTimes(1);
});

it('cancels sequential keypoint placement from Escape outside editable fields', async () => {
  let latest: Controller | null = null;

  render(
    <ControllerHarness
      onValue={value => {
        latest = value;
      }}
    />
  );

  await waitFor(() => {
    expect(latest).not.toBeNull();
  });

  act(() => {
    latest!.toolbarProps.onStartKeypointSequence('L5', [
      'L5-1',
      'L5-2',
      'L5-3',
      'L5-4',
    ]);
  });

  await waitFor(() => {
    expect(latest!.canvasProps.keypointSequenceSession).not.toBeNull();
  });
  activateHandModeMock.mockClear();

  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
  });
  const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

  act(() => {
    document.dispatchEvent(event);
  });

  expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  expect(activateHandModeMock).toHaveBeenCalledTimes(1);
  await waitFor(() => {
    expect(latest!.canvasProps.keypointSequenceSession).toBeNull();
  });
});
