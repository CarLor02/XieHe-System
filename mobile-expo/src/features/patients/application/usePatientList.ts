import { useCallback, useState } from 'react';
import type { MobileServices } from '@/application/services';
import { useResource } from '@/shared/hooks/useResource';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

export function usePatientList(
  patients: Pick<MobileServices['patients'], 'list'>
) {
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebouncedValue(search);
  const load = useCallback(
    () =>
      patients.list({
        page,
        page_size: 20,
        search: query.trim() || undefined,
        gender: gender || undefined,
      }),
    [patients, page, query, gender]
  );
  const resource = useResource(load);
  return {
    search,
    gender,
    page,
    setPage,
    resource,
    changeSearch(value: string) {
      setSearch(value);
      setPage(1);
    },
    changeGender(value: string) {
      setGender(value);
      setPage(1);
    },
    clearFilters() {
      setSearch('');
      setGender('');
      setPage(1);
    },
  };
}
