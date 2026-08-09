import { expect, it } from '@jest/globals';

import { hydratePersistedKeypointState } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/hydratePersistedKeypointStateUseCase';
import {
  AnnotationSource,
  type MeasurementData,
  type VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';

const unboundVertebra: VertebraAnnotation = {
  label: 'T4',
  corners: [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
    { x: 100, y: 160 },
    { x: 200, y: 160 },
  ],
  confidence: 0.9,
  source: AnnotationSource.AI,
};

const boundMeasurement: MeasurementData = {
  id: 'po-1',
  type: 'po',
  value: '0.00°',
  points: [
    { x: 80, y: 300 },
    { x: 240, y: 300 },
  ],
};

it('keeps persisted unbound keypoints while backfilling measurement bindings', () => {
  const result = hydratePersistedKeypointState({
    examType: '正位X光片',
    measurements: [boundMeasurement],
    vertebraeLayer: [unboundVertebra],
    cfhAnnotation: null,
  });

  expect(result.keypoints.map(keypoint => keypoint.id)).toEqual(
    expect.arrayContaining([
      'T4-1',
      'T4-2',
      'T4-3',
      'T4-4',
      'IL',
      'IR',
    ])
  );
  expect(result.vertebraeLayer.map(annotation => annotation.label)).toEqual(
    expect.arrayContaining([
      'T4-1',
      'T4-2',
      'T4-3',
      'T4-4',
      'IL',
      'IR',
    ])
  );
});

it('still backfills historical measurements when no keypoint layer was saved', () => {
  const result = hydratePersistedKeypointState({
    examType: '正位X光片',
    measurements: [boundMeasurement],
    vertebraeLayer: [],
    cfhAnnotation: null,
  });

  expect(result.keypoints.map(keypoint => keypoint.id)).toEqual(['IL', 'IR']);
});
