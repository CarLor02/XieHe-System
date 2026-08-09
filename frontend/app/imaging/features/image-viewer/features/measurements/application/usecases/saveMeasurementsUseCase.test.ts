import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';

import { AnnotationSource } from '@xiehe/imaging-core/contracts';
import type {
  Point,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';
import type { saveImageAnnotation } from '@/services/imageServices';
import { createEmptyBindings } from '@xiehe/imaging-core/bindings';

jest.mock('@/services/imageServices', () => ({
  __esModule: true,
  saveImageAnnotation: jest.fn(),
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
  saveImageAnnotation: jest.MockedFunction<typeof saveImageAnnotation>;
};

const mockedSaveImageAnnotation = mockedImageServices.saveImageAnnotation;

const { saveMeasurements } = jest.requireActual<
  typeof import('./saveMeasurementsUseCase')
>('./saveMeasurementsUseCase');

beforeEach(() => {
  mockedSaveImageAnnotation.mockResolvedValue({
    annotation_version: 1,
    annotation_updated_at: '2026-06-10T10:00:00Z',
    annotation_updated_by: 1,
    has_annotation: true,
    status: 'PROCESSED',
    changed: true,
  });
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
    0,
    jest.fn(),
    { width: 100, height: 100 },
    null,
    null,
    createEmptyBindings(),
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

  expect(mockedSaveImageAnnotation).toHaveBeenCalledTimes(1);
  expect(setSaveMessage).not.toHaveBeenCalledWith(
    expect.stringContaining('quota exceeded')
  );
  expect(setIsSaving).toHaveBeenLastCalledWith(false);
});

it('keeps dynamic measurement metadata in the local maintenance backup', async () => {
  await saveMeasurements(
    '899',
    0,
    jest.fn(),
    { width: 100, height: 100 },
    100,
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    createEmptyBindings(),
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
      {
        id: 'lateral-pi-bilateral',
        type: 'pi',
        points: Array.from({ length: 6 }, (_, index) => ({
          x: index * 10,
          y: index * 20,
        })),
        value: '40.00°',
        keypointSynced: true,
        pelvicMetadata: {
          schemaVersion: 2,
          femoralHeadMode: 'bilateral',
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
  expect(backup.measurements[1]).toMatchObject({
    id: 'lateral-pi-bilateral',
    keypointSynced: true,
    pelvicMetadata: {
      schemaVersion: 2,
      femoralHeadMode: 'bilateral',
    },
  });
});
