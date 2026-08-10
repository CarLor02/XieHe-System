import { describe, expect, it } from 'vitest';

import { AnnotationSource } from '../../shared/domain/contracts';
import { ANNOTATION_DOCUMENT_SCHEMA_VERSION } from './annotation-document';
import {
  createAnnotationDocument,
  decodeAnnotationDocument,
} from './annotation-document-codec';

describe('annotation document codec', () => {
  it('round-trips current measurement metadata and keypoint layers', () => {
    const document = createAnnotationDocument({
      measurements: [
        {
          id: 'avt-1',
          type: 'avt',
          value: '-12.00mm',
          points: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
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
          id: 'pi-1',
          type: 'pi',
          value: '42.00°',
          points: [{ x: 50, y: 60 }],
          pelvicMetadata: {
            schemaVersion: 2,
            femoralHeadMode: 'bilateral',
          },
        },
      ],
      standardDistance: 100,
      standardDistancePoints: [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ],
      pointBindings: { schemaVersion: 2, syncGroups: [] },
      imageWidth: 1000,
      imageHeight: 2000,
      reportText: '报告',
      vertebraeLayer: [
        {
          label: 'T1',
          corners: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 },
            { x: 7, y: 8 },
          ],
          confidence: 0.9,
          source: AnnotationSource.AI,
        },
      ],
      cfhAnnotation: {
        center: { x: 90, y: 100 },
        confidence: 1,
        source: AnnotationSource.MANUAL,
      },
    });

    expect(
      decodeAnnotationDocument(JSON.parse(JSON.stringify(document)))
    ).toEqual(document);
  });

  it('migrates an unversioned legacy document and preserves unknown tool metadata', () => {
    const legacy = {
      measurements: [
        {
          id: 'future-1',
          type: 'future-tool',
          points: [{ x: 1, y: 2 }],
          futureMetadata: { schemaVersion: 3, mode: 'new' },
        },
      ],
      standardDistance: null,
      standardDistancePoints: null,
      imageWidth: 500,
      imageHeight: 800,
    };

    const decoded = decodeAnnotationDocument(legacy);

    expect(decoded).toMatchObject({
      schemaVersion: ANNOTATION_DOCUMENT_SCHEMA_VERSION,
      standardDistance: null,
      standardDistancePoints: null,
    });
    expect(decoded?.measurements[0]).toMatchObject({
      value: '',
      futureMetadata: { schemaVersion: 3, mode: 'new' },
    });
  });

  it('rejects future document versions instead of silently downgrading them', () => {
    expect(
      decodeAnnotationDocument({ schemaVersion: 2, measurements: [] })
    ).toBeNull();
  });
});
