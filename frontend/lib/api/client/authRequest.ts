const AUTH_REFRESH_PATH = '/api/v1/auth/refresh';

export function isAuthRefreshRequest(url?: string | null): boolean {
  return Boolean(url?.includes(AUTH_REFRESH_PATH));
}

export function shouldSkipAuthRefresh(config: {
  _skipAuthRefresh?: boolean;
  url?: string | null;
}): boolean {
  return Boolean(config?._skipAuthRefresh || isAuthRefreshRequest(config?.url));
}

export function shouldAttachAuthorization(config: {
  _skipAuthRefresh?: boolean;
  url?: string | null;
}): boolean {
  return !shouldSkipAuthRefresh(config);
}
