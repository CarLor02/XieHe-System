export type { SessionUser } from '@xiehe/api-contracts';

export type UserSession = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtEpochSeconds: number | null;
};

function decodeJwtExpiration(accessToken: string): number | null {
  try {
    const [, payload] = accessToken.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
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
