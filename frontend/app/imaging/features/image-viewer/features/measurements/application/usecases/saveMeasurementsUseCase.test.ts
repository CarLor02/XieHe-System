import { beforeEach, expect, it, jest } from '@jest/globals';

import { createEmptyBindings } from '@xiehe/imaging-core/bindings';
import type { saveImageAnnotation } from '@/services/imageServices';

jest.mock('@/services/imageServices', () => ({
  __esModule: true,
  saveImageAnnotation: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockedImageServices = jest.requireMock('@/services/imageServices') as {
  saveImageAnnotation: jest.MockedFunction<typeof saveImageAnnotation>;
};
const { saveMeasurements } = jest.requireActual<
  typeof import('./saveMeasurementsUseCase')
>('./saveMeasurementsUseCase');

beforeEach(() => {
  mockedImageServices.saveImageAnnotation.mockReset();
  mockedImageServices.saveImageAnnotation.mockResolvedValue({
    annotation_version: 1,
    annotation_updated_at: '2026-06-10T10:00:00Z',
    annotation_updated_by: 1,
    has_annotation: true,
    status: 'PROCESSED',
    changed: true,
  });
});

it('saves the complete versioned annotation document to the server only', async () => {
  const setIsSaving = jest.fn();
  const setSaveMessage = jest.fn();
  const onAnnotationVersionChange = jest.fn();

  await saveMeasurements(
    '899',
    0,
    onAnnotationVersionChange,
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
        ],
        value: '-40.00mm',
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
    '报告文本',
    setIsSaving,
    setSaveMessage
  );

  expect(mockedImageServices.saveImageAnnotation).toHaveBeenCalledTimes(1);
  expect(mockedImageServices.saveImageAnnotation.mock.calls[0][2]).toMatchObject(
    {
      schemaVersion: 1,
      reportText: '报告文本',
      measurements: [
        {
          id: 'ap-keypoint-avt-disc-t12-l1',
          avtMetadata: { schemaVersion: 2 },
        },
      ],
    }
  );
  expect(onAnnotationVersionChange).toHaveBeenCalledWith(1);
  expect(setSaveMessage).toHaveBeenCalledWith('标注已保存到服务器');
  expect(setIsSaving).toHaveBeenLastCalledWith(false);
});
