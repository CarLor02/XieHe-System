import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { getApiErrorMessage } from '@xiehe/api-client';
import type { SessionUser } from '@xiehe/api-contracts';
import { normalizeServerUrl } from '@/features/auth/domain/serverUrl';
import { signIn, signOut } from '@/features/auth/usecases/session';
import { readSavedApiBaseUrl } from '@/infrastructure/auth';
import {
  createExpoApiInfrastructure,
  type ExpoApiInfrastructure,
} from '@/infrastructure/http/createExpoApiInfrastructure';
import { getExpoApiBaseUrl } from '@/infrastructure/http/config';
import { createMobileServices } from './createMobileServices';
import type { MobileServices } from './services';

interface MobileSession {
  user: SessionUser;
  services: MobileServices;
  api: ExpoApiInfrastructure;
  serverUrl: string;
}
interface AppContextValue {
  session: MobileSession | null;
  booting: boolean;
  busy: boolean;
  startupError: string;
  defaultServerUrl: string;
  login: (server: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: SessionUser) => void;
}
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<MobileSession | null>(null);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [startupError, setStartupError] = useState('');
  const [defaultServerUrl, setDefaultServerUrl] = useState(getExpoApiBaseUrl);
  const generation = useRef(0);
  const createApi = useCallback(
    (server: string, id: number) =>
      createExpoApiInfrastructure({
        apiBaseUrl: server,
        onUnauthorized: () => {
          if (generation.current === id) {
            generation.current += 1;
            setSession(null);
            setStartupError('登录已过期，请重新登录');
          }
        },
      }),
    []
  );

  useEffect(() => {
    const id = ++generation.current;
    async function restore() {
      try {
        const saved = await readSavedApiBaseUrl();
        const server = normalizeServerUrl(
          process.env.EXPO_PUBLIC_API_URL?.trim() ||
            saved ||
            getExpoApiBaseUrl()
        );
        if (generation.current !== id) return;
        setDefaultServerUrl(server);
        const api = createApi(server, id);
        if (await api.tokenStore.getAccessToken()) {
          const user = await api.apiSdk.auth.getSessionUser();
          if (generation.current === id)
            setSession({
              user,
              api,
              serverUrl: server,
              services: createMobileServices(api),
            });
        }
      } catch (cause) {
        if (generation.current === id)
          setStartupError(`恢复登录失败：${getApiErrorMessage(cause)}`);
      } finally {
        setBooting(false);
      }
    }
    void restore();
    return () => {
      generation.current += 1;
    };
  }, [createApi]);

  const login = async (server: string, username: string, password: string) => {
    const url = normalizeServerUrl(server);
    const id = ++generation.current;
    setBusy(true);
    setStartupError('');
    try {
      const api = createApi(url, id);
      const user = await signIn(
        { auth: api.apiSdk.auth, tokens: api.tokenStore },
        username,
        password
      );
      if (id === generation.current) {
        setDefaultServerUrl(url);
        setSession({
          user,
          api,
          serverUrl: url,
          services: createMobileServices(api),
        });
      }
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    if (session?.api) {
      await signOut({
        auth: session.api.apiSdk.auth,
        tokens: session.api.tokenStore,
      });
    }
    generation.current += 1;
    setSession(null);
  };
  const updateUser = (user: SessionUser) =>
    // A profile request belongs to the session that rendered its callback.
    setSession(current =>
      current && current.api === session?.api && current.user.id === user.id
        ? { ...current, user }
        : current
    );
  return (
    <AppContext.Provider
      value={{
        session,
        booting,
        busy,
        startupError,
        defaultServerUrl,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const app = useContext(AppContext);
  if (!app) throw new Error('AppProvider is missing');
  return app;
}
export function useWorkspace() {
  const { session } = useApp();
  if (!session) throw new Error('当前页面需要登录');
  return session;
}
