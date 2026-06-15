import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { expect, it, jest, beforeEach } from '@jest/globals';

const beginHistoryActionMock = jest.fn();
const clearHistoryMock = jest.fn();
const undoHistoryMock = jest.fn();
const redoHistoryMock = jest.fn();
const handleMeasurementDeleteMock = jest.fn();
const handleKeypointDeleteMock = jest.fn();
const setMeasurementsMock = jest.fn();
const setShowVertebraeLayerMock = jest.fn();
const handleToggleVertebraeLayerMock = jest.fn();
let activeVertebraeLayerMock: Array<Record<string, unknown>> = [];
let annotationHistoryOptions:
  | {
      snapshot: Record<string, unknown>;
      restoreSnapshot: (snapshot: Record<string, unknown>) => void;
    }
  | null = null;

jest.mock('@/lib/api', () => ({
  useUser: () => ({ user: { id: 1 } }),
}));

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
    setSelectedTool: jest.fn(),
    handleToolChange: jest.fn(),
    activateHandMode: jest.fn(),
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
    exportAnnotationsToJSON: jest.fn(),
    importAnnotationsFromJSON: jest.fn(),
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
  canExportAnnotationsJson: () => true,
  canUseKeypointTools: () => true,
  useImageListFetcher: jest.fn(),
  useImageStudy: () => ({
    studyData: {
      patient_name: 'patient',
      patient_id: 1,
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
    handleSaveMeasurements: jest.fn(),
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
    handleKeypointAdd: jest.fn(),
    handleKeypointDelete: handleKeypointDeleteMock,
    handleCreateVertebraCenter: jest.fn(),
    handleCreateCobb: jest.fn(),
    handleRectifyVertebraCornerOrder: jest.fn(),
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
  handleKeypointDeleteMock.mockClear();
  setMeasurementsMock.mockClear();
  setShowVertebraeLayerMock.mockClear();
  handleToggleVertebraeLayerMock.mockClear();
  activeVertebraeLayerMock = [];
  annotationHistoryOptions = null;
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
