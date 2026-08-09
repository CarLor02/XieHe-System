import { describe, expect, it } from 'vitest';

import type { MeasurementData } from '../../shared/domain/contracts';

import {
  ANNOTATION_BINDING_SCHEMA_VERSION,
  applyPointBindings,
  createManualPointRef,
  validateAnnotationBindings,
} from './annotation-binding';
import { migrateAnnotationBindings } from './annotation-binding-migration';

function measurement(
  id: string,
  type: string,
  points: MeasurementData['points'],
  extra: Partial<MeasurementData> = {}
): MeasurementData {
  return { id, type, points, value: '', ...extra };
}

describe('manual annotation bindings', () => {
  it('drops every historical generated group and migrates only manual groups', () => {
    const measurements = [
      measurement('pi-1', 'pi', [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ]),
      measurement('pt-1', 'pt', [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ]),
    ];
    const legacy = {
      syncGroups: [
        {
          id: 'pos-1',
          name: '共享点-1',
          color: '#f59e0b',
          members: [
            { annotationId: 'pi-1', pointIndex: 1 },
            { annotationId: 'pt-1', pointIndex: 1 },
          ],
        },
        {
          id: 'S1-left',
          name: 'S1上缘-左端点',
          color: '#f59e0b',
          members: [
            { annotationId: 'pi-1', pointIndex: 1 },
            { annotationId: 'pt-1', pointIndex: 1 },
          ],
        },
        {
          id: 'manual-1',
          name: '手动绑定组 1',
          color: '#22d3ee',
          members: [
            { annotationId: 'pi-1', pointIndex: 0 },
            { annotationId: 'pt-1', pointIndex: 0 },
          ],
        },
      ],
    };

    const migrated = migrateAnnotationBindings(legacy, measurements);

    expect(migrated.schemaVersion).toBe(ANNOTATION_BINDING_SCHEMA_VERSION);
    expect(migrated.syncGroups).toHaveLength(1);
    expect(migrated.syncGroups[0]).toMatchObject({
      id: 'manual-1',
      source: 'manual',
    });
    expect(
      migrated.syncGroups[0].members.every(
        member => member.layoutFingerprint.length > 0
      )
    ).toBe(true);
  });

  it('invalidates a manual binding when the pelvic point layout changes', () => {
    const singlePi = measurement('pi-1', 'pi', [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ]);
    const pt = measurement('pt-1', 'pt', [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ]);
    const piMember = createManualPointRef(singlePi, 1)!;
    const ptMember = createManualPointRef(pt, 1)!;
    const bindings = {
      schemaVersion: ANNOTATION_BINDING_SCHEMA_VERSION,
      syncGroups: [
        {
          id: 'manual-1',
          name: '手动绑定组 1',
          color: '#22d3ee',
          source: 'manual' as const,
          members: [piMember, ptMember],
        },
      ],
    };
    const bilateralPi = measurement(
      'pi-1',
      'pi',
      Array.from({ length: 6 }, (_, index) => ({ x: index, y: index })),
      {
        pelvicMetadata: {
          schemaVersion: 2,
          femoralHeadMode: 'bilateral',
        },
      }
    );

    expect(validateAnnotationBindings(bindings, [bilateralPi, pt])).toEqual({
      schemaVersion: ANNOTATION_BINDING_SCHEMA_VERSION,
      syncGroups: [],
    });
  });

  it('does not reinterpret a historical position binding as a bilateral FH radius binding', () => {
    const bilateralPi = measurement(
      'pi-1',
      'pi',
      [
        { x: 10, y: 20 },
        { x: 30, y: 20 },
        { x: 70, y: 40 },
        { x: 70, y: 70 },
        { x: 20, y: 100 },
        { x: 80, y: 100 },
      ],
      {
        pelvicMetadata: {
          schemaVersion: 2,
          femoralHeadMode: 'bilateral',
        },
      }
    );
    const ss = measurement('ss-1', 'ss', [
      { x: 20, y: 100 },
      { x: 80, y: 100 },
    ]);
    const migrated = migrateAnnotationBindings(
      {
        syncGroups: [
          {
            id: 'pos-1',
            name: '共享点-1',
            color: '#f59e0b',
            members: [
              // 在旧单 FH 布局里 PI[1] 曾代表 S1 端点；双 FH 中它是半径点。
              { annotationId: 'pi-1', pointIndex: 1 },
              { annotationId: 'ss-1', pointIndex: 1 },
            ],
          },
        ],
      },
      [bilateralPi, ss]
    );

    const updated = applyPointBindings(
      [bilateralPi, ss],
      'pi-1',
      1,
      45,
      25,
      migrated
    );

    expect(migrated.syncGroups).toEqual([]);
    expect(updated[1].points).toEqual(ss.points);
  });

  it('propagates only a valid explicit manual binding', () => {
    const pi = measurement('pi-1', 'pi', [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ]);
    const pt = measurement('pt-1', 'pt', [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ]);
    const bindings = {
      schemaVersion: ANNOTATION_BINDING_SCHEMA_VERSION,
      syncGroups: [
        {
          id: 'manual-1',
          name: '手动绑定组 1',
          color: '#22d3ee',
          source: 'manual' as const,
          members: [createManualPointRef(pi, 0)!, createManualPointRef(pt, 0)!],
        },
      ],
    };

    const updated = applyPointBindings(
      [pi, pt],
      'pi-1',
      0,
      100,
      120,
      bindings
    );

    expect(updated[1].points[0]).toEqual({ x: 100, y: 120 });
    expect(updated[1].points[1]).toEqual({ x: 20, y: 20 });
  });
});
