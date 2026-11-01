import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate, imageTeamLabel, truncateImageLabel } from './presentation';

afterEach(() => vi.unstubAllEnvs());

describe('影像上传日期', () => {
  it.each(['UTC', 'Asia/Shanghai', 'America/Los_Angeles'])(
    '在设备时区 %s 下都显示北京时间',
    timeZone => {
      vi.stubEnv('TZ', timeZone);
      const timestamps = [
        '2026-11-01T05:25:00',
        '2026-11-01 05:25:00.123456',
        '2026-11-01T05:25:00Z',
        '2026-11-01T13:25:00+08:00',
        '2026-11-01T13:25:00+0800',
      ];
      for (const timestamp of timestamps) {
        expect(formatDate(timestamp).match(/\d+/g)).toEqual([
          '2026',
          '11',
          '01',
          '13',
          '25',
        ]);
      }
    }
  );

  it('转换跨日时间并将午夜显示为 00 点', () => {
    expect(formatDate('2026-10-31T16:05:00Z').match(/\d+/g)).toEqual([
      '2026',
      '11',
      '01',
      '00',
      '05',
    ]);
  });

  it('缺失时间显示占位，异常时间保留可见内容', () => {
    for (const value of [undefined, null, '', '  ']) {
      expect(formatDate(value)).toBe('未记录');
    }
    expect(formatDate('无效时间')).toBe('无效时间');
  });
});

describe('影像归属与长名称', () => {
  it('连接有效团队名，忽略空名称', () => {
    expect(imageTeamLabel({ team_names: [' 骨科 ', '', '  ', '研究组'] })).toBe(
      '骨科、研究组'
    );
  });

  it('有团队 ID 但缺少名称时仍显示团队归属', () => {
    expect(imageTeamLabel({ team_ids: [1, 2], team_names: [' '] })).toBe(
      '已归属 2 个团队'
    );
    expect(imageTeamLabel({})).toBe('仅自己可见');
  });

  it('名称超过十个字符时截断，短名称保持完整', () => {
    expect(truncateImageLabel('协和医院脊柱影像研究团队')).toBe(
      '协和医院脊柱影像研究…'
    );
    expect(truncateImageLabel('脊柱影像研究组')).toBe('脊柱影像研究组');
    expect(truncateImageLabel('一二三四五六七八九十')).toBe(
      '一二三四五六七八九十'
    );
  });

  it('截断不会拆开 Unicode 代理对', () => {
    expect(truncateImageLabel('一二三四五六七八九🦴研究组')).toBe(
      '一二三四五六七八九🦴…'
    );
  });
});
