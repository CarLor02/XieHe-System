import { describe, expect, it } from 'vitest';
import {
  AnnotationSource,
  type MeasurementData,
} from '@xiehe/imaging-core/contracts';
import { createEmptyBindings } from '@xiehe/imaging-core/bindings';
import {
  BasicMode,
  type AnnotationEditorSnapshot,
} from '@xiehe/imaging-core/editor';
import {
  keypointsToPersistedLayer,
  type KeypointAnnotation,
} from '@xiehe/imaging-core/keypoints';
import { createAvtMeasurement } from '@xiehe/imaging-core/measurement-keypoint-sync';
import {
  getAnnotationTypeId,
  type CalculationContext,
} from '@xiehe/imaging-core/measurements';
import {
  correctVertebraCorners,
  offsetVertebraLabels,
} from './correctKeypoints';
import { deriveCobbFromKeypoints } from './deriveCobb';
import {
  getEditorBasicModes,
  getRectificationGroups,
} from './editorToolQueries';
import { measurementCalculator } from './measurementValues';

const context: CalculationContext = {
  examType: '正位X光片',
  imageNaturalSize: { width: 1000, height: 2000 },
  standardDistance: 100,
  standardDistancePoints: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ],
};
const point = (id: string, x: number, y: number): KeypointAnnotation => ({
  id,
  point: { x, y },
  source: AnnotationSource.AI,
  confidence: 0.9,
});
const group = (id: string, y: number) => [
  point(`${id}-1`, 100, y),
  point(`${id}-2`, 300, y + 20),
  point(`${id}-3`, 120, y + 100),
  point(`${id}-4`, 310, y + 70),
];
function snapshot(
  keypoints: KeypointAnnotation[],
  measurements: MeasurementData[] = []
): AnnotationEditorSnapshot {
  return {
    keypoints,
    measurements,
    vertebraeLayer: keypointsToPersistedLayer(keypoints),
    cfhAnnotation: null,
    standardDistance: 100,
    standardDistanceValue: '100',
    standardDistancePoints: context.standardDistancePoints!,
    pointBindings: createEmptyBindings(),
    aiMeasurementIds: [],
  };
}
const swap = [
  { from: 1, to: 3 },
  { from: 2, to: 4 },
  { from: 3, to: 1 },
  { from: 4, to: 2 },
] as const;

describe('椎体点位纠正的应用编排', () => {
  it('重排角点后同步原测量，保留无关点和输入快照', () => {
    const keys = [...group('T1', 100), ...group('T2', 400)];
    const base = snapshot(keys, [
      {
        id: 'tilt',
        type: 'T1 Tilt',
        points: keys.slice(0, 2).map(item => item.point),
        value: '5.71°',
        keypointSynced: true,
      },
    ]);
    const before = JSON.stringify(base);
    const next = correctVertebraCorners(base, context, 'T1', [...swap]);
    expect(next.keypoints.find(item => item.id === 'T1-1')?.point).toEqual(
      keys[2].point
    );
    expect(next.keypoints.find(item => item.id === 'T1-3')?.point).toEqual(
      keys[0].point
    );
    expect(next.measurements.find(item => item.id === 'tilt')?.points).toEqual(
      keys.slice(2, 4).map(item => item.point)
    );
    expect(
      next.measurements.filter(
        item => getAnnotationTypeId(item.type) === 't1-tilt'
      )
    ).toHaveLength(1);
    expect(next.keypoints.filter(item => item.id.startsWith('T2'))).toEqual(
      keys.slice(4)
    );
    expect(JSON.stringify(base)).toBe(before);
  });

  it('不完整椎体和重复目标序号被拒绝', () => {
    expect(() =>
      correctVertebraCorners(
        snapshot(group('T1', 100).slice(0, 3)),
        context,
        'T1',
        [...swap]
      )
    ).toThrow('尚不完整');
    expect(() =>
      correctVertebraCorners(
        snapshot(group('T1', 100)),
        context,
        'T1',
        swap.map(item => ({ ...item, to: 1 }))
      )
    ).toThrow('缺少序号');
  });

  it('整体偏移同时迁移关键点、Cobb 端椎和 AVT 目标，保留坐标', () => {
    const base = snapshot([
      ...group('C7', 0),
      ...group('T1', 200),
      ...group('T2', 500),
    ]);
    const derived = deriveCobbFromKeypoints(base, context, 'T1', 'T2');
    const avt = createAvtMeasurement({
      target: { type: 'vertebra', vertebra: 'T2' },
      keypoints: base.keypoints,
      calculationContext: context,
      calculator: measurementCalculator,
    });
    expect(avt).not.toBeNull();
    derived.measurements.push(avt!);
    const before = JSON.stringify(derived);
    const next = offsetVertebraLabels(derived, context, {
      startVertebra: 'T1',
      endVertebra: 'T2',
      direction: 'down',
      offset: 1,
    });
    expect(next.keypoints.find(item => item.id === 'T2-1')?.point).toEqual(
      base.keypoints.find(item => item.id === 'T1-1')?.point
    );
    expect(next.keypoints.find(item => item.id === 'T3-4')?.point).toEqual(
      base.keypoints.find(item => item.id === 'T2-4')?.point
    );
    expect(next.keypoints.some(item => item.id === 'T1-1')).toBe(false);
    expect(
      next.measurements.find(item => item.id === derived.measurements[0].id)
    ).toMatchObject({ upperVertebra: 'T2', lowerVertebra: 'T3' });
    expect(
      next.measurements.find(item => item.id === avt!.id)?.avtMetadata?.target
    ).toEqual({ type: 'vertebra', vertebra: 'T3' });
    expect(JSON.stringify(derived)).toBe(before);
  });

  it.each([0, -1, 0.5, NaN])('偏移量 %s 不合法时拒绝修改', offset => {
    expect(() =>
      offsetVertebraLabels(snapshot(group('T1', 100)), context, {
        startVertebra: 'T1',
        endVertebra: 'T1',
        direction: 'down',
        offset,
      })
    ).toThrow('有效偏移量');
  });

  it('拒绝颠倒范围、超出检查目录的目标和空范围', () => {
    const base = snapshot(group('T1', 100));
    expect(() =>
      offsetVertebraLabels(base, context, {
        startVertebra: 'T2',
        endVertebra: 'T1',
        direction: 'up',
        offset: 1,
      })
    ).toThrow('起始椎体');
    expect(() =>
      offsetVertebraLabels(base, context, {
        startVertebra: 'C7',
        endVertebra: 'T1',
        direction: 'up',
        offset: 1,
      })
    ).toThrow('超出可用范围');
    expect(() =>
      offsetVertebraLabels(base, context, {
        startVertebra: 'T4',
        endVertebra: 'T5',
        direction: 'down',
        offset: 1,
      })
    ).toThrow('没有可偏移');
  });
});

describe('Cobb 派生', () => {
  it.each(['正位X光片', '左侧曲位', '右侧曲位'])(
    '在 %s 仅要求对应端板两点，不要求四角完整',
    examType => {
      const base = snapshot([
        point('T1-1', 100, 100),
        point('T1-2', 300, 120),
        point('T3-3', 100, 500),
        point('T3-4', 300, 470),
      ]);
      const next = deriveCobbFromKeypoints(
        base,
        { ...context, examType },
        'T1',
        'T3'
      );
      expect(next.measurements).toHaveLength(1);
      expect(next.measurements[0]).toMatchObject({
        upperVertebra: 'T1',
        lowerVertebra: 'T3',
        keypointSynced: true,
      });
      expect(next.measurements[0].value).toMatch(/°$/);
      expect(next.keypoints).toEqual(base.keypoints);
      expect(base.measurements).toEqual([]);
      expect(() =>
        deriveCobbFromKeypoints(next, { ...context, examType }, 'T1', 'T3')
      ).toThrow('不可重复派生');
    }
  );

  it('侧位 S1 使用上终板两点，命名测量组合必须使用专用工具', () => {
    const base = snapshot([
      ...group('L2', 500),
      ...group('L1', 200),
      point('S1-1', 100, 1000),
      point('S1-2', 300, 1010),
    ]);
    const lateral = { ...context, examType: '侧位X光片' };
    const next = deriveCobbFromKeypoints(base, lateral, 'L2', 'S1');
    expect(next.measurements[0]).toMatchObject({
      upperVertebra: 'L2',
      lowerVertebra: 'S1',
      keypointSynced: true,
    });
    expect(() => deriveCobbFromKeypoints(base, lateral, 'L1', 'S1')).toThrow(
      '专用工具'
    );
  });

  it('拒绝上下端椎颠倒或相同、缺失端板点和不支持的检查类型', () => {
    const base = snapshot(group('T1', 100));
    expect(() => deriveCobbFromKeypoints(base, context, 'T2', 'T1')).toThrow(
      '上端椎'
    );
    expect(() => deriveCobbFromKeypoints(base, context, 'T1', 'T1')).toThrow(
      '上端椎'
    );
    expect(() => deriveCobbFromKeypoints(base, context, 'T1', 'T2')).toThrow(
      '缺少'
    );
    expect(() =>
      deriveCobbFromKeypoints(
        base,
        { ...context, examType: '体态照片' },
        'T1',
        'T2'
      )
    ).toThrow('不支持');
  });

  it('模式和纠正组由检查类型与点位完整度决定', () => {
    expect(getEditorBasicModes('体态照片')).toEqual([BasicMode.Move]);
    expect(getEditorBasicModes('侧位X光片')).toContain(
      BasicMode.MeasurementDerive
    );
    const groups = getRectificationGroups(
      snapshot(group('T1', 100)),
      '侧位X光片'
    );
    expect(groups.find(item => item.id === 'T1')?.complete).toBe(true);
    expect(groups.find(item => item.id === 'T2')?.complete).toBe(false);
    expect(groups.some(item => item.id === 'S1')).toBe(false);
  });
});
