import { describe, expect, it } from 'vitest';
import { newReport, reportChanges, reportDraft } from './reportForm';

describe('report writes', () => {
  it('requires a patient and title before creating', () => {
    expect(() => newReport(reportDraft())).toThrow('患者');
    expect(() => newReport(reportDraft(), 4)).toThrow('标题');
    expect(
      newReport({ ...reportDraft(), report_title: '  检查报告  ' }, 4)
    ).toMatchObject({
      patient_id: 4,
      report_title: '检查报告',
      priority: 'normal',
    });
  });
  it('sends cleared content explicitly and never invents review state or a study/image association', () => {
    const changes = reportChanges({
      ...reportDraft(),
      report_title: '报告',
      findings: '',
    });
    expect(changes.findings).toBe('');
    expect(changes).not.toHaveProperty('status');
    expect(changes).not.toHaveProperty('study_id');
    expect(changes).not.toHaveProperty('reviewed_by');
  });
});
