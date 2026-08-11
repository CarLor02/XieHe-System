import { describe, expect, it } from 'vitest';

import { prepareStudyEditorState } from './prepare-study-editor-state';

const source = {
  id: 8,
  file_uuid: 'image-8',
  patient_id: 2,
  patient_name: ' 测试患者 ',
  patient_identifier: 'P002',
  file_type: 'PNG',
  status: 'UPLOADED',
  created_at: '2026-08-02T10:00:00',
  annotation_version: 7,
};

describe('prepareStudyEditorState', () => {
  it('uses server metadata and explicit defaults for an empty annotation', () => {
    const result = prepareStudyEditorState({
      source: { ...source, annotation: null },
      normalizeMeasurementType: value => value.toLowerCase(),
    });
    expect(result.study.patient_name).toBe('测试患者');
    expect(result.annotationVersion).toBe(7);
    expect(result.standardDistance).toBe(100);
    expect(result.standardDistancePoints).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]);
  });

  it('hydrates measurements, report and persisted keypoints together', () => {
    const result = prepareStudyEditorState({
      source: {
        ...source,
        description: '正位X光片',
        annotation: {
          measurements: [
            {
              id: 'm1',
              type: 'T1 Tilt',
              points: [
                { x: 1, y: 2 },
                { x: 3, y: 4 },
              ],
              value: '1°',
            },
          ],
          reportText: '报告',
          vertebraeLayer: [],
        },
      },
      normalizeMeasurementType: () => 't1-tilt',
    });
    expect(result.measurements[0].type).toBe('t1-tilt');
    expect(result.reportText).toBe('报告');
    expect(result.keypointState.keypoints).toHaveLength(2);
  });

  it('rejects an unsupported persisted document', () => {
    expect(() =>
      prepareStudyEditorState({
        source: { ...source, annotation: { schemaVersion: 999 } },
        normalizeMeasurementType: value => value,
      })
    ).toThrow('不支持的标注文档版本');
  });
});
