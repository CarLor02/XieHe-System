import { useCallback, useState } from 'react';
import type { MobileServices } from '@/application/services';
import { useResource } from '@/shared/hooks/useResource';

export function useAnnotationHistory(
  gateway: Pick<
    MobileServices['imaging'],
    'listAnnotationHistory' | 'getAnnotationHistory'
  >,
  imageId: number
) {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState<number | null>(null);
  const list = useResource(
    useCallback(
      () => gateway.listAnnotationHistory(imageId, page),
      [gateway, imageId, page]
    )
  );
  const detail = useResource(
    useCallback(
      () =>
        version === null
          ? Promise.resolve(null)
          : gateway.getAnnotationHistory(imageId, version),
      [gateway, imageId, version]
    )
  );
  return { list, detail, page, setPage, version, setVersion };
}
