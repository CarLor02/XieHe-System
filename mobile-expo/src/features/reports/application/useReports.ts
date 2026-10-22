import { useCallback, useState } from 'react';
import { useResource } from '../../../shared/hooks/useResource';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import type { ReportsGateway } from './ports';

export const reportStatuses = [
  ['', '全部状态'],
  ['DRAFT', '草稿'],
  ['IN_REVIEW', '待审核'],
  ['APPROVED', '已审核'],
  ['FINALIZED', '已完成'],
  ['CANCELLED', '已取消'],
  ['ARCHIVED', '已归档'],
] as const;
export const reportStatusLabel = (status: string) =>
  reportStatuses.find(([key]) => key === status.toUpperCase())?.[1] ?? status;
export function useReports(gateway: ReportsGateway, patientId?: number) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebouncedValue(search);
  const resource = useResource(
    useCallback(
      () =>
        gateway.list({
          page,
          page_size: 20,
          search: query.trim() || undefined,
          status: status || undefined,
          patient_id: patientId,
        }),
      [gateway, page, query, status, patientId]
    )
  );
  return {
    ...resource,
    search,
    status,
    page,
    setPage,
    searchFor: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    filter: (value: string) => {
      setStatus(value);
      setPage(1);
    },
  };
}
