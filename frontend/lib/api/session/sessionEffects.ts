const AUTH_STORAGE_KEY = 'auth-storage';
const LOGIN_PATH = '/auth/login';
type LoginRedirectMode = 'assign' | 'replace';

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
    if (mode === 'replace') {
      window.location.replace(LOGIN_PATH);
      return;
    }

    window.location.href = LOGIN_PATH;
  };

  if (delayMs <= 0) {
    redirect();
    return;
  }

  window.setTimeout(redirect, delayMs);
}
