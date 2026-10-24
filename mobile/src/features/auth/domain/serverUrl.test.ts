import { describe, expect, it } from 'vitest';
import { normalizeServerUrl } from './serverUrl';
import { parseStoredSession } from '@/infrastructure/auth/sessionTokens';

describe('server/session boundary', () => {
  it('normalizes the unified API root', () => {
    expect(normalizeServerUrl(' https://xiehe.stellarmesh.cn/ ')).toBe(
      'https://xiehe.stellarmesh.cn'
    );
  });
  it.each([
    'ftp://example.org',
    'https://user:secret@example.org',
    'https://example.org/api/v1',
    'https://example.org?token=secret',
    'not a server',
  ])('rejects unsafe or non-root addresses', url => {
    expect(() => normalizeServerUrl(url)).toThrow();
  });
  it('rejects corrupt or incomplete persisted sessions', () => {
    expect(parseStoredSession('{bad')).toBeNull();
    expect(parseStoredSession('{"accessToken":"token"}')).toBeNull();
    expect(
      parseStoredSession(
        JSON.stringify({
          apiBaseUrl: 'https://example.org',
          accessToken: 'access',
          refreshToken: 'refresh',
        })
      )
    ).toEqual({
      apiBaseUrl: 'https://example.org',
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });
});
