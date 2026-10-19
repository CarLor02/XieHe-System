import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { apiSdk } from '@/infrastructure/http';
import {
  getAiKeypointDetectionResponse,
  getAiMeasurementsResponse,
} from '../aiMeasurementService';

describe('aiMeasurementService', () => {
  const predictSpy = jest.spyOn(apiSdk.imaging, 'predict');
  const detectSpy = jest.spyOn(apiSdk.imaging, 'detectKeypoints');

  beforeEach(() => {
    predictSpy.mockReset();
    detectSpy.mockReset();
  });

  it('requests AI measurements through the authenticated backend object proxy', async () => {
    predictSpy.mockResolvedValue({
      imageId: 'IMG42',
      imageWidth: 100,
      imageHeight: 200,
      measurements: [],
    });

    await expect(
      getAiMeasurementsResponse('IMG00042', '正位X光片')
    ).resolves.toEqual({
      imageId: 'IMG42',
      imageWidth: 100,
      imageHeight: 200,
      measurements: [],
    });

    expect(predictSpy).toHaveBeenCalledWith('42');
  });

  it('passes numeric IDs to the legacy keypoint detection gateway', async () => {
    detectSpy.mockResolvedValue({
      imageId: 'IMG42',
      imageWidth: 100,
      imageHeight: 200,
      pose_keypoints: {},
      vertebrae: {},
    });

    await expect(getAiKeypointDetectionResponse('IMG00042')).resolves.toEqual({
      imageId: 'IMG42',
      imageWidth: 100,
      imageHeight: 200,
      pose_keypoints: {},
      vertebrae: {},
    });

    expect(detectSpy).toHaveBeenCalledWith('42');
  });
});
