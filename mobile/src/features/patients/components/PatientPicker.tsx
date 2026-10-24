import { useCallback, useState } from 'react';
import { useWorkspace } from '@/application/AppProvider';
import { useResource } from '@/shared/hooks/useResource';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  Choice,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  SearchField,
} from '@/shared/ui';

export function PatientPicker({
  selectedId,
  onSelect,
}: {
  selectedId?: number;
  onSelect: (patient: { id: number; name: string }) => void;
}) {
  const { services } = useWorkspace();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebouncedValue(search);
  const load = useCallback(
    () =>
      services.patients.list({
        page,
        page_size: 20,
        search: query || undefined,
      }),
    [services, page, query]
  );
  const resource = useResource(load);
  return (
    <>
      <SearchField
        value={search}
        onChangeText={value => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="搜索患者姓名或编号"
      />
      {resource.loading && <LoadingState />}
      {!!resource.error && (
        <ErrorState
          message={resource.error}
          onRetry={() => void resource.reload()}
        />
      )}
      {resource.data?.items.map(patient => (
        <Choice
          key={patient.id}
          title={`${patient.name} · ${patient.patient_id}`}
          selected={patient.id === selectedId}
          onPress={() => onSelect(patient)}
        />
      ))}
      {resource.data?.total === 0 && <EmptyState title="没有匹配的患者" />}
      {resource.data && (
        <Pagination
          page={page}
          total={resource.data.total}
          loading={resource.loading}
          onChange={setPage}
        />
      )}
    </>
  );
}
