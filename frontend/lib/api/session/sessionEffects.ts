const AUTH_STORAGE_KEY = 'auth-storage';
const LOGIN_PATH = '/auth/login';

export function clearPersistedAuthState(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function redirectToLogin(delayMs = 500): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (delayMs <= 0) {
    window.location.href = LOGIN_PATH;
    return;
  }

  window.setTimeout(() => {
    window.location.href = LOGIN_PATH;
  }, delayMs);
}
