import { describe, expect, it } from 'vitest';

import { validateLoginForm, validateRegisterForm } from './auth-validation';
import { createUserSession } from './user-session';

describe('auth core', () => {
  it('validates login and optional registration phone', () => {
    expect(validateLoginForm({ username: '', password: '1' })).toEqual({
      username: '请输入用户名或邮箱',
      password: '密码至少6位',
    });
    expect(
      validateRegisterForm({
        username: 'doctor_1',
        email: 'doctor@example.com',
        password: 'abc123',
        confirm_password: 'abc123',
        full_name: '医生',
        phone: '',
      })
    ).toEqual({});
  });

  it('decodes JWT expiration without a browser atob dependency', () => {
    const payload = Buffer.from(JSON.stringify({ exp: 1234 })).toString(
      'base64url'
    );
    expect(
      createUserSession({
        accessToken: `header.${payload}.signature`,
        refreshToken: 'refresh',
      }).accessTokenExpiresAtEpochSeconds
    ).toBe(1234);
  });
});
