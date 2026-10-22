import { useCallback, useState } from 'react';
import type { ReportResponse } from '@xiehe/api-contracts/generated';
import { useResource } from '../../../shared/hooks/useResource';
import { useMutation } from '../../../shared/hooks/useMutation';
import { reportDraft, reportChanges, newReport } from './reportForm';
import type { ReportsGateway } from './ports';

export function useReportEditor(gateway: ReportsGateway, reportId?: number) {
  const resource = useResource(
    useCallback(() => {
      if (
        reportId !== undefined &&
        (!Number.isSafeInteger(reportId) || reportId <= 0)
      )
        throw new Error('无效的报告编号');
      return reportId ? gateway.get(reportId) : Promise.resolve(null);
    }, [gateway, reportId])
  );
  return resource;
}
export function useReportDraft(
  gateway: ReportsGateway,
  source: ReportResponse | null,
  patientId?: number,
  patientName?: string
) {
  const [current, setCurrent] = useState(source);
  const [baseline, setBaseline] = useState(reportDraft(source ?? undefined));
  const [draft, setDraft] = useState(baseline);
  const [patient, setPatient] = useState<{ id: number; name: string } | null>(
    source
      ? {
          id: source.patient_id,
          name: source.patient_name || `患者 ${source.patient_id}`,
        }
      : patientId
        ? { id: patientId, name: patientName || `患者 ${patientId}` }
        : null
  );
  const mutation = useMutation();
  const save = () =>
    mutation.run(
      () =>
        current
          ? gateway.update(current.id, reportChanges(draft))
          : gateway.create(newReport(draft, patient?.id)),
      value => {
        setCurrent(value);
        const next = reportDraft(value);
        setDraft(next);
        setBaseline(next);
      }
    );
  return {
    current,
    draft,
    setDraft,
    patient,
    setPatient,
    mutation,
    save,
    dirty: JSON.stringify(draft) !== JSON.stringify(baseline),
    remove: (onDeleted: () => void) =>
      current &&
      mutation.run(() => gateway.delete(current.id), onDeleted, '报告已删除'),
  };
}
