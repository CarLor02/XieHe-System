export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export function extractPaginatedData<T>(response: any): PaginatedResult<T> {
  const responseData = response.data;

  if (responseData?.code !== undefined && responseData?.data?.items !== undefined) {
    const { items, pagination } = responseData.data;
    return {
      items: items || [],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      pageSize: pagination?.page_size || 20,
      totalPages: pagination?.total_pages || 1,
    };
  }

  if (responseData?.items !== undefined) {
    return {
      items: responseData.items || [],
      total: responseData.total || 0,
      page: responseData.page || 1,
      pageSize: responseData.page_size || 20,
      totalPages: responseData.total_pages || 1,
    };
  }

  if (Array.isArray(responseData?.data)) {
    return {
      items: responseData.data || [],
      total: responseData.total || 0,
      page: responseData.page || 1,
      pageSize: responseData.page_size || 20,
      totalPages: responseData.total_pages || 1,
    };
  }

  if (Array.isArray(responseData)) {
    return {
      items: responseData,
      total: responseData.length,
      page: 1,
      pageSize: responseData.length,
      totalPages: 1,
    };
  }

  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  };
}
