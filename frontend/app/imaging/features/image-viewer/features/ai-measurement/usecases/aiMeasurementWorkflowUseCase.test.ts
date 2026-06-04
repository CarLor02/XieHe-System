import { expect, it, jest } from '@jest/globals';

import { getColorForType } from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-metadata';
import { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';
import type { PredictMeasurementsResponse } from '@/services/imageServices/aiMeasurementService';

jest.mock('@/services/imageServices', () => ({
  __esModule: true,
  getAiMeasurementsResponse: jest.fn(),
}));

const { getAiMeasurementsResponse: mockedGetAiMeasurementsResponse } =
  jest.requireMock('@/services/imageServices') as {
    getAiMeasurementsResponse: jest.MockedFunction<
      () => Promise<PredictMeasurementsResponse>
    >;
  };

const { runAiMeasurementWorkflow } = jest.requireActual<
  typeof import('@/app/imaging/features/image-viewer/features/ai-measurement/usecases/aiMeasurementWorkflowUseCase')
>(
  '@/app/imaging/features/image-viewer/features/ai-measurement/usecases/aiMeasurementWorkflowUseCase'
);

function cobbAiMeasurement(
  type: string,
  upperVertebra: string,
  lowerVertebra: string
) {
  return {
    type,
    upper_vertebra: upperVertebra,
    lower_vertebra: lowerVertebra,
    points: [
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 10, y: 30 },
      { x: 20, y: 30 },
    ],
  };
}

it('numbers AI Cobb measurements and uses the configured Cobb colors', async () => {
  mockedGetAiMeasurementsResponse.mockResolvedValue({
    imageId: 'image-1',
    imageWidth: 1000,
    imageHeight: 1000,
    measurements: [
      cobbAiMeasurement('Cobb-Auto1', 'T5', 'T12'),
      cobbAiMeasurement('Cobb-Auto2', 'T10', 'L2'),
      cobbAiMeasurement('Cobb-Auto3', 'L1', 'L5'),
    ],
  });
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  let capturedMeasurements: MeasurementData[] = [];

  try {
    await runAiMeasurementWorkflow({
      imageId: 'image-1',
      imageData: {
        id: 'image-1',
        patientName: 'test',
        patientId: 'p1',
        examType: 'ap',
        studyDate: '2026-05-11',
        captureTime: '09:00',
        seriesCount: 1,
        status: 'completed',
      },
      imageNaturalSize: { width: 1000, height: 1000 },
      setImageNaturalSize: jest.fn(),
      setMeasurements: next => {
        capturedMeasurements =
          typeof next === 'function' ? next(capturedMeasurements) : next;
      },
      setPointBindings: jest.fn(),
      setSaveMessage: jest.fn(),
      setIsAIMeasuring: jest.fn(),
      setIsAIDetecting: jest.fn(),
      canUseKeypoints: false,
      isLateralView: false,
      setVertebraeLayer: jest.fn(),
      setKeypoints: jest.fn(),
      setShowVertebraeLayer: jest.fn(),
      setCfhAnnotation: jest.fn(),
      rebuildKeypointMeasurements: previousMeasurements => previousMeasurements,
      lateralDetectionResultRef: { current: null },
      aiMeasurementIdsRef: { current: new Set<string>() },
    });
  } finally {
    logSpy.mockRestore();
  }

  expect(capturedMeasurements.map(measurement => measurement.type)).toEqual([
    'cobb1',
    'cobb2',
    'cobb3',
  ]);
  expect(capturedMeasurements.map(measurement => getColorForType(measurement.type))).toEqual([
    '#3b82f6',
    '#a855f7',
    '#ec4899',
  ]);
  expect(
    capturedMeasurements.map(measurement => [
      measurement.upperVertebra,
      measurement.lowerVertebra,
    ])
  ).toEqual([
    ['T5', 'T12'],
    ['T10', 'L2'],
    ['L1', 'L5'],
  ]);
});
