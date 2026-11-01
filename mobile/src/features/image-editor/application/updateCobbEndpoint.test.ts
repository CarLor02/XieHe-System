import { describe, expect, it } from 'vitest';
import { createEmptyBindings } from '@xiehe/imaging-core/bindings';
import {
  AnnotationSource,
  type MeasurementData,
} from '@xiehe/imaging-core/contracts';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import {
  keypointsToPersistedLayer,
  type KeypointAnnotation,
} from '@xiehe/imaging-core/keypoints';
import type { CalculationContext } from '@xiehe/imaging-core/measurements';
import { updateCobbEndpoint } from './updateCobbEndpoint';

const points = [
  { x: 100, y: 100 },
  { x: 300, y: 120 },
  { x: 110, y: 500 },
  { x: 310, y: 460 },
];
const context: CalculationContext = {
  examType: '正位X光片',
  imageNaturalSize: { width: 1000, height: 2000 },
  standardDistance: null,
  standardDistancePoints: [],
};
const cobb = (overrides: Partial<MeasurementData> = {}): MeasurementData => ({
  id: 'cobb-id',
  type: 'cobb4',
  points,
  value: '99.99°',
  ...overrides,
});
const keypoint = (id: string, index: number): KeypointAnnotation => ({
  id,
  point: points[index],
  source: AnnotationSource.AI,
  confidence: 0.8,
});
function snapshot(
  measurements: MeasurementData[],
  keypoints: KeypointAnnotation[] = []
): AnnotationEditorSnapshot {
  return {
    measurements,
    keypoints,
    vertebraeLayer: keypointsToPersistedLayer(keypoints),
    cfhAnnotation: null,
    standardDistance: null,
    standardDistanceValue: '',
    standardDistancePoints: [],
    pointBindings: createEmptyBindings(),
    aiMeasurementIds: [],
  };
}

describe('修改 Cobb 端椎', () => {
  it.each(['正位X光片', '左侧曲位', '右侧曲位'])(
    '%s 分两次补齐待定端椎，保留当前几何与测量身份并写回关键点',
    examType => {
      const base = snapshot([cobb()]);
      const upper = updateCobbEndpoint(
        base,
        { ...context, examType },
        'cobb-id',
        'upperVertebra',
        ' t1 '
      );
      expect(upper.measurements[0]).toMatchObject({
        id: 'cobb-id',
        type: 'cobb4',
        upperVertebra: 'T1',
        points,
        value: '99.99°',
      });
      expect(upper.keypoints).toEqual([]);
      const complete = updateCobbEndpoint(
        upper,
        { ...context, examType },
        'cobb-id',
        'lowerVertebra',
        'T3'
      );
      expect(complete.measurements[0]).toMatchObject({
        id: 'cobb-id',
        type: 'cobb4',
        upperVertebra: 'T1',
        lowerVertebra: 'T3',
        keypointSynced: true,
        points,
      });
      expect(complete.measurements[0].value).not.toBe('99.99°');
      expect(
        Object.fromEntries(
          complete.keypoints.map(item => [item.id, item.point])
        )
      ).toEqual({
        'T1-1': points[0],
        'T1-2': points[1],
        'T3-3': points[2],
        'T3-4': points[3],
      });
      expect(base.measurements[0].upperVertebra).toBeUndefined();
      expect(base.keypoints).toEqual([]);
    }
  );

  it('将当前 Cobb 点写入目标端椎，更新关联测量并保留无关点', () => {
    const keys = [
      keypoint('T1-1', 2),
      keypoint('T1-2', 3),
      keypoint('T3-3', 2),
      keypoint('T3-4', 3),
      keypoint('T5-1', 0),
    ];
    const base = snapshot(
      [
        cobb({ upperVertebra: 'T2', lowerVertebra: 'T3' }),
        {
          id: 'tilt',
          type: 'T1 Tilt',
          points: points.slice(2),
          value: '旧数值',
          keypointSynced: true,
        },
      ],
      keys
    );
    const before = JSON.stringify(base);
    const next = updateCobbEndpoint(
      base,
      context,
      'cobb-id',
      'upperVertebra',
      'T1'
    );
    expect(
      next.measurements.find(item => item.id === 'cobb-id')?.points
    ).toEqual(points);
    expect(next.measurements.find(item => item.id === 'tilt')?.points).toEqual(
      points.slice(0, 2)
    );
    expect(next.keypoints.find(item => item.id === 'T1-1')).toMatchObject({
      point: points[0],
      source: AnnotationSource.MANUAL,
    });
    expect(next.keypoints.find(item => item.id === 'T5-1')).toEqual(keys[4]);
    expect(JSON.stringify(base)).toBe(before);
  });

  it('目标点坐标相同时仍重算改绑的测量，并保留点位来源', () => {
    const keys = [
      keypoint('T1-1', 0),
      keypoint('T1-2', 1),
      keypoint('T3-3', 2),
      keypoint('T3-4', 3),
    ];
    const next = updateCobbEndpoint(
      snapshot(
        [
          cobb({
            upperVertebra: 'T2',
            lowerVertebra: 'T3',
            keypointSynced: true,
          }),
        ],
        keys
      ),
      context,
      'cobb-id',
      'upperVertebra',
      'T1'
    );
    expect(next.measurements[0].value).not.toBe('99.99°');
    expect(next.keypoints).toEqual(keys);
  });

  it('侧位下端椎 S1 使用上终板，并拒绝侧位专用测量组合', () => {
    const lateral = { ...context, examType: '侧位X光片' };
    const base = snapshot([
      cobb({ type: 'lateral-cobb4', upperVertebra: 'L2', lowerVertebra: 'L5' }),
    ]);
    const next = updateCobbEndpoint(
      base,
      lateral,
      'cobb-id',
      'lowerVertebra',
      'S1'
    );
    expect(next.keypoints.find(item => item.id === 'S1-1')?.point).toEqual(
      points[2]
    );
    expect(next.keypoints.find(item => item.id === 'S1-2')?.point).toEqual(
      points[3]
    );
    expect(() =>
      updateCobbEndpoint(next, lateral, 'cobb-id', 'upperVertebra', 'L1')
    ).toThrow('专用工具');
  });

  it('校验相同或颠倒端椎、重复组合、非法椎体与非 Cobb 测量', () => {
    const base = snapshot([
      cobb({ upperVertebra: 'T1', lowerVertebra: 'T3' }),
      cobb({
        id: 'other',
        type: 'cobb5',
        upperVertebra: 'T1',
        lowerVertebra: 'T5',
      }),
    ]);
    expect(() =>
      updateCobbEndpoint(base, context, 'cobb-id', 'upperVertebra', 'T3')
    ).toThrow('上端椎');
    expect(() =>
      updateCobbEndpoint(base, context, 'cobb-id', 'upperVertebra', 'T4')
    ).toThrow('上端椎');
    expect(() =>
      updateCobbEndpoint(base, context, 'cobb-id', 'lowerVertebra', 'T5')
    ).toThrow('不可重复派生');
    expect(() =>
      updateCobbEndpoint(base, context, 'cobb-id', 'upperVertebra', 'C2')
    ).toThrow('不支持所选端椎');
    expect(() =>
      updateCobbEndpoint(
        snapshot([{ ...cobb(), type: 'aux-length' }]),
        context,
        'cobb-id',
        'upperVertebra',
        'T1'
      )
    ).toThrow('不支持修改');
    expect(() =>
      updateCobbEndpoint(base, context, 'missing-id', 'upperVertebra', 'T1')
    ).toThrow('不支持修改');
  });

  it('重复选择当前端椎不改动快照', () => {
    const base = snapshot([cobb({ upperVertebra: 'T1', lowerVertebra: 'T3' })]);
    expect(
      updateCobbEndpoint(base, context, 'cobb-id', 'upperVertebra', 'T1')
    ).toBe(base);
  });
});
