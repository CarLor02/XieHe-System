import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { apiClient } from '@/lib/api';
import {
  getAiKeypointDetectionResponse,
  getAiMeasurementsResponse,
} from '../aiMeasurementService';

describe('aiMeasurementService', () => {
  const postSpy = jest.spyOn(apiClient, 'post');

  beforeEach(() => {
    postSpy.mockReset();
  });

  it('requests AI measurements through the authenticated backend object proxy', async () => {
    postSpy.mockResolvedValue({
      data: {
        imageId: 'IMG42',
        imageWidth: 100,
        imageHeight: 200,
        measurements: [],
      },
    });

    await expect(
      getAiMeasurementsResponse('IMG00042', '正位X光片')
    ).resolves.toEqual({
      imageId: 'IMG42',
      imageWidth: 100,
      imageHeight: 200,
      measurements: [],
    });

    expect(postSpy).toHaveBeenCalledWith('/api/v1/image-files/42/ai/predict');
  });

  it('requests keypoint detection through the authenticated backend object proxy', async () => {
    postSpy.mockResolvedValue({
      data: {
        imageId: 'IMG42',
        pose_keypoints: {},
        vertebrae: {},
      },
    });

    await expect(getAiKeypointDetectionResponse('IMG00042')).resolves.toEqual({
      imageId: 'IMG42',
      pose_keypoints: {},
      vertebrae: {},
    });

    expect(postSpy).toHaveBeenCalledWith(
      '/api/v1/image-files/42/ai/detect-keypoints'
    );
  });
});
