const AUTH_STORAGE_KEY = 'auth-storage';
const LOGIN_PATH = '/auth/login';
type LoginRedirectMode = 'assign' | 'replace';

export function withNavigationCacheBuster(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }

  const url = new URL(path, window.location.origin);
  url.searchParams.set('_cb', Date.now().toString(36));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function clearPersistedAuthState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function redirectToLogin(
  delayMs = 500,
  mode: LoginRedirectMode = 'assign'
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const redirect = () => {
    const loginPath = withNavigationCacheBuster(LOGIN_PATH);

    if (mode === 'replace') {
      window.location.replace(loginPath);
      return;
    }

    window.location.href = loginPath;
  };

  if (delayMs <= 0) {
    redirect();
    return;
  }

  window.setTimeout(redirect, delayMs);
}
