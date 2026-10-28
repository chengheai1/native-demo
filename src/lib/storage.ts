import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'xu.session.token';
const THEME_KEY = 'xu.theme.mode';

export async function readSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function writeSessionToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function readThemeMode(): Promise<'system' | 'light' | 'dark' | null> {
  try {
    const value =
      Platform.OS === 'web'
        ? (globalThis.localStorage?.getItem(THEME_KEY) ?? null)
        : await SecureStore.getItemAsync(THEME_KEY);
    return value === 'system' || value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export async function writeThemeMode(mode: 'system' | 'light' | 'dark'): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(THEME_KEY, mode);
      return;
    }
    await SecureStore.setItemAsync(THEME_KEY, mode);
  } catch {
    // Theme persistence is best-effort; the in-memory choice still applies.
  }
}
