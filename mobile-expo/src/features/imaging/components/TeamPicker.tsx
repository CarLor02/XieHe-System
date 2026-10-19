import { useCallback, useState } from 'react';
import { useWorkspace } from '../../../application/AppProvider';
import { useResource } from '../../../shared/hooks/useResource';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import {
  Choice,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination,
  SearchField,
} from '../../../shared/ui';

export function TeamPicker({
  selected,
  onToggle,
}: {
  selected: { id: number; name: string }[];
  onToggle: (team: { id: number; name: string }) => void;
}) {
  const { services } = useWorkspace();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebouncedValue(search);
  const load = useCallback(
    () =>
      services.imaging.listAssignableTeams({
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
        placeholder="搜索可分配的团队"
      />
      {resource.loading && <LoadingState />}
      {!!resource.error && (
        <ErrorState
          message={resource.error}
          onRetry={() => void resource.reload()}
        />
      )}
      {resource.data?.items.map(team => (
        <Choice
          key={team.id}
          title={team.name}
          selected={selected.some(item => item.id === team.id)}
          onPress={() => onToggle(team)}
        />
      ))}
      {resource.data?.total === 0 && <EmptyState title="暂无可选团队" />}
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
