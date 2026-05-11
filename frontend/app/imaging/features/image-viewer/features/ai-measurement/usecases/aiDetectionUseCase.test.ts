import { expect, it, jest } from '@jest/globals';

import { VertebraAnnotation } from '@/app/imaging/features/image-viewer/shared/types';
import { DetectKeypointsResponse } from '@/services/imageServices/aiAnnotationService';

jest.mock('@/services/imageServices', () => ({
  __esModule: true,
  getAiKeypointDetectionResponse: jest.fn(),
}));

const { getAiKeypointDetectionResponse: mockedGetAiKeypointDetectionResponse } =
  jest.requireMock('@/services/imageServices') as {
    getAiKeypointDetectionResponse: jest.MockedFunction<
      (imageId: string) => Promise<DetectKeypointsResponse>
    >;
  };

const { aiDetect } = jest.requireActual<
  typeof import('@/app/imaging/features/image-viewer/features/ai-measurement/usecases/aiDetectionUseCase')
>(
  '@/app/imaging/features/image-viewer/features/ai-measurement/usecases/aiDetectionUseCase'
);

it('requests detection by image id and maps frontal AI pose labels so patient left stays on screen left', async () => {
  mockedGetAiKeypointDetectionResponse.mockResolvedValue({
    imageId: 'image-1',
    imageWidth: 1000,
    imageHeight: 1000,
    pose_keypoints: {
      CR: { x: 100, y: 100, confidence: 0.9 },
      CL: { x: 900, y: 100, confidence: 0.8 },
      IR: { x: 120, y: 700, confidence: 0.7 },
      IL: { x: 880, y: 700, confidence: 0.6 },
      SR: { x: 140, y: 900, confidence: 0.5 },
      SL: { x: 860, y: 900, confidence: 0.4 },
    },
    vertebrae: {},
  });
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  let capturedLayer: VertebraAnnotation[] = [];

  try {
    await aiDetect(
      'image-1',
      {
        id: 'image-1',
        patientName: 'test',
        patientId: 'p1',
        examType: '正位X光片',
        studyDate: '2026-05-11',
        captureTime: '09:00',
        seriesCount: 1,
        status: 'completed',
      },
      nextLayer => {
        capturedLayer =
          typeof nextLayer === 'function' ? nextLayer(capturedLayer) : nextLayer;
      },
      jest.fn(),
      jest.fn(),
      jest.fn()
    );
  } finally {
    logSpy.mockRestore();
    jest.restoreAllMocks();
  }

  expect(mockedGetAiKeypointDetectionResponse).toHaveBeenCalledWith('image-1');

  const byLabel = new Map(
    capturedLayer.map(annotation => [annotation.label, annotation.corners[0]])
  );
  expect(byLabel.get('CL')?.x).toBe(100);
  expect(byLabel.get('CR')?.x).toBe(900);
  expect(byLabel.get('IL')?.x).toBe(120);
  expect(byLabel.get('IR')?.x).toBe(880);
  expect(byLabel.get('SL')?.x).toBe(140);
  expect(byLabel.get('SR')?.x).toBe(860);
});
