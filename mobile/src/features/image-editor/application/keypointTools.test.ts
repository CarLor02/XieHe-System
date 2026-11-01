import { describe, expect, it } from 'vitest';
import { AnnotationSource } from '@xiehe/imaging-core/contracts';
import { getKeypointToolGroups } from './keypointTools';

const point = (id: string) => ({
  id,
  point: { x: 10, y: 20 },
  source: AnnotationSource.MANUAL,
  confidence: 1,
});

describe('关键点工具可用性', () => {
  it('按正位、侧位、侧曲和非关键点检查显示可绘制分组', () => {
    const ids = (exam: string) =>
      getKeypointToolGroups(exam, []).map(group => group.id);
    expect(ids('正位X光片')).toContain('pose');
    expect(ids('正位X光片')).not.toContain('C2');
    expect(ids('侧位X光片')).toEqual(
      expect.arrayContaining(['C2', 'S1', 'CFH', 'FH'])
    );
    expect(ids('左侧曲位')).toContain('C7');
    expect(ids('左侧曲位')).not.toContain('pose');
    expect(ids('体态照片')).toEqual([]);
  });

  it('完整组禁用，部分组只补缺失点，股骨头模式冲突禁用', () => {
    const partial = getKeypointToolGroups('正位X光片', [point('T1-2')]).find(
      group => group.id === 'T1'
    )!;
    expect(partial.existingCount).toBe(1);
    expect(partial.missing.map(item => item.id)).toEqual([
      'T1-1',
      'T1-3',
      'T1-4',
    ]);
    expect(partial.blockedReason).toBe('');
    const full = getKeypointToolGroups(
      '正位X光片',
      [1, 2, 3, 4].map(i => point(`T1-${i}`))
    ).find(group => group.id === 'T1')!;
    expect(full.blockedReason).toBe('已完整');
    expect(
      getKeypointToolGroups('侧位X光片', [point('CFH')]).find(
        group => group.id === 'FH'
      )!.blockedReason
    ).toContain('另一种股骨头模式');
  });
});
