export interface UserSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtEpochSeconds: number | null;
}

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  let bits = '';
  for (const character of normalized.replace(/=+$/, '')) {
    const index = BASE64_ALPHABET.indexOf(character);
    if (index < 0) throw new Error('Invalid base64url character');
    bits += index.toString(2).padStart(6, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

export function decodeJwtExpiration(accessToken: string): number | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
    return typeof decoded.exp === 'number' ? decoded.exp : null;
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
