import type { SessionUser } from '@xiehe/api-contracts';
import type { AuthenticationSession } from '@/features/auth/application/ports';
import { validateLoginForm } from '@xiehe/auth-core';

export async function signIn(
  session: AuthenticationSession,
  username: string,
  password: string
): Promise<SessionUser> {
  const errors = validateLoginForm({ username, password });
  const message = Object.values(errors)[0];
  if (message) throw new Error(message);
  const response = await session.auth.login({
    username: username.trim(),
    password,
    remember_me: true,
  });
  if (!response.access_token || !response.refresh_token)
    throw new Error('登录响应缺少会话令牌');
  await session.tokens.save({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
  });
  return response.user;
}

export async function signOut(session: AuthenticationSession): Promise<void> {
  const token = await session.tokens.getAccessToken();
  // 先结束本机会话，令并发刷新和迟到响应失效；登出请求使用刚捕获的令牌。
  await session.tokens.clear();
  try {
    if (token)
      await session.auth.logout({
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
  } catch {
    // 断网或服务端会话已失效时，仍允许清除本机凭据并退出。
  }
}
