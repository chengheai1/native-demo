import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { exchangeNativeCode, getMe, nativeDemo, logout } from '@/api/auth';
import { ApiError, onUnauthorized, setApiToken } from '@/api/client';
import type { User } from '@/api/types';
import { API_URL } from '@/lib/api-url';
import { clearSessionToken, readSessionToken, writeSessionToken } from '@/lib/storage';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'error';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  error: string | null;
  signInDemo: () => Promise<void>;
  startGoogleSignIn: () => Promise<{ cancelled: boolean }>;
  signOut: () => Promise<void>;
  retry: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return '操作失败，请稍后重试';
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const AUTH_ERROR_COPY: Record<string, string> = {
  google_not_configured: 'Google 登录尚未配置，请先使用演示登录。',
  access_denied: '已取消 Google 登录。',
  state_mismatch: '登录链接已失效，请重新发起登录。',
  email_unverified: '邮箱尚未验证，请先在 Google 账号中完成验证。',
  oauth_failed: 'Google 登录没有完成，请稍后重试。',
  invalid_code: '登录链接已失效，请重新登录。',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bootStarted = useRef(false);

  const applySession = useCallback(
    async (nextToken: string, nextUser: User) => {
      await writeSessionToken(nextToken);
      setApiToken(nextToken);
      setToken(nextToken);
      setUser(nextUser);
      setError(null);
      setStatus('signedIn');
      await queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
    [queryClient],
  );

  const clearSession = useCallback(async () => {
    setApiToken(null);
    setToken(null);
    setUser(null);
    setStatus('signedOut');
    await clearSessionToken();
    queryClient.clear();
  }, [queryClient]);

  const bootstrap = useCallback(async () => {
    setStatus('loading');
    setError(null);

    const stored = await readSessionToken();
    if (!stored) {
      setStatus('signedOut');
      await SplashScreen.hideAsync().catch(() => undefined);
      return;
    }

    setApiToken(stored);
    setToken(stored);
    try {
      const currentUser = await getMe();
      setUser(currentUser);
      setStatus('signedIn');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await clearSession();
      } else {
        setError(errorMessage(caught));
        setStatus('error');
      }
    } finally {
      await SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [clearSession]);

  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    return onUnauthorized(() => {
      void clearSession();
    });
  }, [clearSession]);

  const signInDemo = useCallback(async () => {
    setError(null);
    try {
      const session = await nativeDemo();
      await applySession(session.token, session.user);
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      throw new Error(message);
    }
  }, [applySession]);

  const startGoogleSignIn = useCallback(async () => {
    setError(null);

    if (Platform.OS === 'web') {
      const redirectUri = `${window.location.origin}/web-auth`;
      window.location.assign(
        `${API_URL}/api/auth/google/web/start?redirect=${encodeURIComponent(redirectUri)}`,
      );
      return { cancelled: false };
    }

    const redirectUri = Linking.createURL('auth');
    const startUrl = `${API_URL}/api/auth/google/native/start?redirect=${encodeURIComponent(
      redirectUri,
    )}`;

    try {
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);
      if (result.type !== 'success' || !result.url) {
        return { cancelled: true };
      }

      const parsed = Linking.parse(result.url);
      const code = firstParam(parsed.queryParams?.code);
      const oauthError = firstParam(parsed.queryParams?.error);

      if (oauthError) {
        throw new Error(AUTH_ERROR_COPY[oauthError] ?? 'Google 登录没有完成。');
      }
      if (!code) {
        throw new Error('Google 登录没有返回授权码。');
      }

      const session = await exchangeNativeCode(code);
      await applySession(session.token, session.user);
      return { cancelled: false };
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      throw new Error(message);
    }
  }, [applySession]);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Local credentials must be cleared even when the network is down.
    }
    await clearSession();
  }, [clearSession]);

  const retry = useCallback(async () => {
    await bootstrap();
  }, [bootstrap]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      status,
      user,
      token,
      error,
      signInDemo,
      startGoogleSignIn,
      signOut,
      retry,
      clearError,
    }),
    [
      clearError,
      error,
      retry,
      signInDemo,
      signOut,
      startGoogleSignIn,
      status,
      token,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
