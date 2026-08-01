import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';

import { AnnotationSource } from '@/app/imaging/features/image-viewer/shared/types';
import type {
  Point,
  StudyData,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import type {
  saveMeasurementRecord,
  updateImageAnnotation,
} from '@/services/imageServices';

jest.mock('@/services/imageServices', () => ({
  __esModule: true,
  saveMeasurementRecord: jest.fn(),
  updateImageAnnotation: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  }),
}));

const mockedImageServices = jest.requireMock('@/services/imageServices') as {
  saveMeasurementRecord: jest.MockedFunction<typeof saveMeasurementRecord>;
  updateImageAnnotation: jest.MockedFunction<typeof updateImageAnnotation>;
};

const mockedSaveMeasurementRecord = mockedImageServices.saveMeasurementRecord;
const mockedUpdateImageAnnotation = mockedImageServices.updateImageAnnotation;

const { saveMeasurements } = jest.requireActual<
  typeof import('./saveMeasurementsUseCase')
>('./saveMeasurementsUseCase');

beforeEach(() => {
  mockedSaveMeasurementRecord.mockResolvedValue({
    measurements: [],
    reportText: '',
    savedAt: '2026-06-10T10:00:00Z',
  });
  mockedUpdateImageAnnotation.mockResolvedValue({ message: 'ok' });
});

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

it('continues saving annotations to the server when localStorage backup exceeds quota', async () => {
  const originalSetItem = Storage.prototype.setItem;
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
    if (key === 'annotations_898') {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    }
    return originalSetItem.call(localStorage, key, value);
  });
  const setIsSaving = jest.fn();
  const setSaveMessage = jest.fn();
  const measurementPoints: Point[] = [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
  ];

  await saveMeasurements(
    '898',
    {
      patient_id: 1,
      patient_name: '张三',
      study_description: '正位X光片',
      modality: 'DX',
      study_date: '2026-06-10',
      created_at: '2026-06-10T10:00:00Z',
    } as StudyData,
    { width: 100, height: 100 },
    null,
    null,
    { syncGroups: [] },
    [
      {
        id: 'measurement-1',
        type: 'Length',
        points: measurementPoints,
        value: '10mm',
      },
    ],
    '报告文本',
    setIsSaving,
    setSaveMessage,
    [
      {
        label: 'T1-1',
        corners: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 2, y: 2 },
          { x: 1, y: 2 },
        ],
        confidence: 1,
        source: AnnotationSource.MANUAL,
      } satisfies VertebraAnnotation,
    ],
    null
  );

  expect(mockedSaveMeasurementRecord).toHaveBeenCalledTimes(1);
  expect(mockedUpdateImageAnnotation).toHaveBeenCalledTimes(1);
  expect(setSaveMessage).not.toHaveBeenCalledWith(
    expect.stringContaining('quota exceeded')
  );
  expect(setIsSaving).toHaveBeenLastCalledWith(false);
});

it('keeps AVT metadata and binding fields in the local maintenance backup', async () => {
  await saveMeasurements(
    '899',
    {
      patient_id: 1,
      patient_name: '张三',
      study_description: '正位X光片',
      modality: 'DX',
      study_date: '2026-06-10',
      created_at: '2026-06-10T10:00:00Z',
    } as StudyData,
    { width: 100, height: 100 },
    100,
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    { syncGroups: [] },
    [
      {
        id: 'ap-keypoint-avt-disc-t12-l1',
        type: 'avt',
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 20 },
          { x: 50, y: 80 },
          { x: 70, y: 80 },
        ],
        value: '-40.00mm',
        apexVertebra: null,
        keypointSynced: true,
        avtMetadata: {
          schemaVersion: 2,
          target: {
            type: 'disc',
            upperVertebra: 'T12',
            lowerVertebra: 'L1',
          },
          referenceLine: 'csvl',
        },
      },
    ],
    '',
    jest.fn(),
    jest.fn()
  );

  const backup = JSON.parse(localStorage.getItem('annotations_899') ?? '{}');
  expect(backup.measurements[0]).toMatchObject({
    id: 'ap-keypoint-avt-disc-t12-l1',
    apexVertebra: null,
    keypointSynced: true,
    avtMetadata: {
      schemaVersion: 2,
      target: {
        type: 'disc',
        upperVertebra: 'T12',
        lowerVertebra: 'L1',
      },
      referenceLine: 'csvl',
    },
  });
});
