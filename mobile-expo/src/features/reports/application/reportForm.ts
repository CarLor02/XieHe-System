import type {
  ReportCreate,
  ReportResponse,
  RequestUpdateReport,
} from '@xiehe/api-contracts/generated';

export const reportFields = [
  ['clinical_history', '临床病史'],
  ['examination_technique', '检查技术'],
  ['findings', '影像所见'],
  ['impression', '诊断印象'],
  ['primary_diagnosis', '主要诊断'],
  ['secondary_diagnosis', '次要诊断'],
  ['recommendations', '建议'],
] as const;
export type ReportDraft = Record<
  (typeof reportFields)[number][0] | 'report_title' | 'priority',
  string
>;
export function reportDraft(source?: ReportResponse): ReportDraft {
  return {
    report_title: source?.report_title ?? '',
    priority: source?.priority ?? 'normal',
    clinical_history: source?.clinical_history ?? '',
    examination_technique: source?.examination_technique ?? '',
    findings: source?.findings ?? '',
    impression: source?.impression ?? '',
    primary_diagnosis: source?.primary_diagnosis ?? '',
    secondary_diagnosis: source?.secondary_diagnosis ?? '',
    recommendations: source?.recommendations ?? '',
  };
}
export function reportChanges(
  draft: ReportDraft
): Omit<RequestUpdateReport, 'report_id'> {
  if (!draft.report_title.trim()) throw new Error('请填写报告标题');
  // Empty text is sent explicitly so clearing a field also clears its persisted value.
  return { ...draft, report_title: draft.report_title.trim() };
}
export function newReport(
  draft: ReportDraft,
  patientId?: number
): ReportCreate {
  if (!patientId || !Number.isSafeInteger(patientId))
    throw new Error('请选择患者');
  return {
    ...reportChanges(draft),
    report_title: draft.report_title.trim(),
    patient_id: patientId,
    priority: draft.priority,
  };
}
