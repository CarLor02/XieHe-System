export type AuthMode = 'required' | 'optional' | 'none';
export type ResponseMode = 'envelope' | 'raw';
export type BinaryResponseType = 'blob' | 'arraybuffer';

export interface HttpRequestOptions {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  auth?: AuthMode;
  responseMode?: ResponseMode;
  responseType?: 'json' | BinaryResponseType;
}

export interface HttpRequest<TBody = unknown> extends HttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: TBody;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface HttpClient {
  request<TResponse, TBody = unknown>(
    request: HttpRequest<TBody>
  ): Promise<TResponse>;
  requestWithMetadata<TResponse, TBody = unknown>(
    request: HttpRequest<TBody>
  ): Promise<HttpResponse<TResponse>>;
  get<TResponse>(url: string, options?: HttpRequestOptions): Promise<TResponse>;
  post<TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    options?: HttpRequestOptions
  ): Promise<TResponse>;
  put<TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    options?: HttpRequestOptions
  ): Promise<TResponse>;
  patch<TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    options?: HttpRequestOptions
  ): Promise<TResponse>;
  delete<TResponse>(
    url: string,
    options?: HttpRequestOptions
  ): Promise<TResponse>;
}
