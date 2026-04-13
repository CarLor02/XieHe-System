export interface SessionUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  real_name?: string;
  employee_id?: string;
  department?: string;
  department_id?: number;
  position?: string;
  title?: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  is_superuser?: boolean;
  is_system_admin?: boolean;
  system_admin_level?: number;
  created_at: string;
  updated_at: string;
}

export type UserSession = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtEpochSeconds: number | null;
};

function decodeJwtExpiration(accessToken: string): number | null {
  try {
    const [, payload] = accessToken.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded?.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
}

export function createUserSession(input: {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtEpochSeconds?: number | null;
}): UserSession {
  return {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    accessTokenExpiresAtEpochSeconds:
      input.accessTokenExpiresAtEpochSeconds ??
      decodeJwtExpiration(input.accessToken),
  };
}
