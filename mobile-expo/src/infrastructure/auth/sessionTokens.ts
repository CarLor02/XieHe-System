export interface MobileSessionTokens {
  accessToken: string;
  refreshToken: string;
}
export interface MobileSessionTokenStore {
  getSessionEpoch(): number;
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  save(tokens: MobileSessionTokens): Promise<void>;
  clear(): Promise<void>;
}
export interface StoredMobileSession extends MobileSessionTokens {
  apiBaseUrl: string;
}

export interface SessionStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}

let storageQueue: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation);
  storageQueue = result.catch(() => undefined);
  return result;
}

export function createBoundSessionTokenStore(
  apiBaseUrl: string,
  storage: SessionStorage
): MobileSessionTokenStore {
  let active = true;
  let epoch = 0;
  let observedAccessToken: string | undefined;
  const read = async () => {
    if (!active) return null;
    const session = parseStoredSession(await storage.read());
    if (session?.apiBaseUrl !== apiBaseUrl) return null;
    if (
      observedAccessToken !== undefined &&
      session.accessToken !== observedAccessToken
    )
      return null;
    observedAccessToken = session.accessToken;
    return session;
  };
  return {
    getSessionEpoch: () => epoch,
    getAccessToken: () =>
      serial(async () => (await read())?.accessToken ?? null),
    getRefreshToken: () =>
      serial(async () => (await read())?.refreshToken ?? null),
    save: tokens =>
      serial(async () => {
        // 退出后到达的刷新响应不得重新写入令牌，也不能覆盖后来登录的新会话。
        if (!active || (observedAccessToken !== undefined && !(await read())))
          throw new Error('当前登录已结束，请重新登录');
        await storage.write(JSON.stringify({ apiBaseUrl, ...tokens }));
        observedAccessToken = tokens.accessToken;
      }),
    clear() {
      active = false;
      epoch += 1;
      return serial(async () => {
        const current = parseStoredSession(await storage.read());
        if (
          observedAccessToken !== undefined &&
          current?.apiBaseUrl === apiBaseUrl &&
          current.accessToken === observedAccessToken
        )
          await storage.remove();
      });
    },
  };
}

export function parseStoredSession(
  raw: string | null
): StoredMobileSession | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    if (
      'apiBaseUrl' in value &&
      typeof value.apiBaseUrl === 'string' &&
      'accessToken' in value &&
      typeof value.accessToken === 'string' &&
      'refreshToken' in value &&
      typeof value.refreshToken === 'string'
    ) {
      return {
        apiBaseUrl: value.apiBaseUrl,
        accessToken: value.accessToken,
        refreshToken: value.refreshToken,
      };
    }
  } catch {
    /* A corrupt/older session returns to login without exposing its raw value. */
  }
  return null;
}
