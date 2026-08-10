export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function toPaginatedResult<T>(data: PaginatedData<T>): PaginatedResult<T> {
  return {
    items: data.items,
    total: data.pagination.total,
    page: data.pagination.page,
    pageSize: data.pagination.page_size,
    totalPages: data.pagination.total_pages,
  };
}

// Transitional parser for endpoints that still return one of the historical
// pagination shapes. New contracts should expose PaginatedData<T> directly.
export function normalizeLegacyPagination<T>(payload: unknown): PaginatedResult<T> {
  const value = payload as {
    data?: unknown;
    items?: T[];
    pagination?: Partial<PaginationMeta>;
    total?: number;
    page?: number;
    page_size?: number;
    total_pages?: number;
  };
  const nested = value?.data as typeof value | T[] | undefined;
  const source =
    nested && !Array.isArray(nested) && nested.items !== undefined
      ? nested
      : value;
  const items = Array.isArray(source)
    ? source
    : Array.isArray(source?.items)
      ? source.items
      : Array.isArray(nested)
        ? nested
        : [];
  const pagination = Array.isArray(source) ? undefined : source?.pagination;
  const total = pagination?.total ?? (Array.isArray(source) ? items.length : source?.total) ?? 0;
  const page = pagination?.page ?? (Array.isArray(source) ? 1 : source?.page) ?? 1;
  const pageSize =
    pagination?.page_size ??
    (Array.isArray(source) ? items.length : source?.page_size) ??
    20;
  const totalPages =
    pagination?.total_pages ??
    (Array.isArray(source) ? (items.length > 0 ? 1 : 0) : source?.total_pages) ??
    (pageSize > 0 ? Math.ceil(total / pageSize) : 0);

  return { items, total, page, pageSize, totalPages };
}
