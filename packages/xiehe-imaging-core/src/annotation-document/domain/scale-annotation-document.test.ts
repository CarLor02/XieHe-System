import { describe, expect, it } from 'vitest';

import { AnnotationSource } from '../../shared/domain/contracts';
import { createAnnotationDocument } from './annotation-document-codec';
import { scaleAnnotationDocument } from './scale-annotation-document';

describe('scaleAnnotationDocument', () => {
  it('scales every image-coordinate field while preserving business metadata', () => {
    const source = createAnnotationDocument({
      measurements: [
        {
          id: 'pi-1',
          type: 'pi',
          value: '40°',
          points: [{ x: 10, y: 20 }],
          pelvicMetadata: {
            schemaVersion: 2,
            femoralHeadMode: 'bilateral',
          },
        },
      ],
      standardDistance: 100,
      standardDistancePoints: [{ x: 5, y: 10 }],
      imageWidth: 100,
      imageHeight: 200,
      vertebraeLayer: [
        {
          label: 'T1',
          corners: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 },
            { x: 7, y: 8 },
          ],
          confidence: 1,
          source: AnnotationSource.AI,
        },
      ],
      cfhAnnotation: {
        center: { x: 20, y: 40 },
        confidence: 1,
        source: AnnotationSource.MANUAL,
      },
    });

    const scaled = scaleAnnotationDocument(source, {
      width: 200,
      height: 100,
    });

    expect(scaled.measurements[0]?.points[0]).toEqual({ x: 20, y: 10 });
    expect(scaled.standardDistancePoints?.[0]).toEqual({ x: 10, y: 5 });
    expect(scaled.vertebraeLayer?.[0]?.corners[0]).toEqual({ x: 2, y: 1 });
    expect(scaled.cfhAnnotation?.center).toEqual({ x: 40, y: 20 });
    expect(scaled.measurements[0]?.pelvicMetadata).toEqual(
      source.measurements[0]?.pelvicMetadata
    );
  });

  it('does not guess a scale when the source image size is absent', () => {
    const source = createAnnotationDocument({
      measurements: [
        { id: 'm1', type: 'length', value: '', points: [{ x: 5, y: 6 }] },
      ],
      standardDistance: null,
      standardDistancePoints: null,
    });

    expect(
      scaleAnnotationDocument(source, { width: 1000, height: 2000 })
        .measurements[0]?.points[0]
    ).toEqual({ x: 5, y: 6 });
  });
});
