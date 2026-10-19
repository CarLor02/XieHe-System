import type { SessionUser } from '@xiehe/api-contracts';
import type { ExpoApiInfrastructure } from '../../../infrastructure/http/createExpoApiInfrastructure';
import { validateLoginForm } from '@xiehe/auth-core';

export async function signIn(
  api: ExpoApiInfrastructure,
  username: string,
  password: string
): Promise<SessionUser> {
  const errors = validateLoginForm({ username, password });
  const message = Object.values(errors)[0];
  if (message) throw new Error(message);
  const response = await api.apiSdk.auth.login({
    username: username.trim(),
    password,
    remember_me: true,
  });
  if (!response.access_token || !response.refresh_token)
    throw new Error('登录响应缺少会话令牌');
  await api.tokenStore.save({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
  });
  return response.user;
}

export async function signOut(api: ExpoApiInfrastructure): Promise<void> {
  const token = await api.tokenStore.getAccessToken();
  try {
    if (token)
      await api.apiSdk.auth.logout({
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
  } catch {
    // 断网或服务端会话已失效时，仍允许清除本机凭据并退出。
  }
  await api.tokenStore.clear();
}
