import { apiFetch } from './client';
import type { AuthConfig, EmailCodeSession, User } from './types';

export function getAuthConfig(): Promise<AuthConfig> {
  return apiFetch<AuthConfig>('/api/auth/config');
}

export async function getMe(): Promise<User> {
  const data = await apiFetch<{ user: User }>('/api/auth/me');
  return data.user;
}

export async function requestEmailCode(email: string): Promise<EmailCodeSession> {
  return apiFetch<EmailCodeSession>('/api/auth/email/code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<{ token: string; user: User }> {
  return apiFetch<{ token: string; user: User }>('/api/auth/email/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export async function nativeDemo(): Promise<{ token: string; user: User }> {
  return apiFetch<{ token: string; user: User }>('/api/auth/native/demo', {
    method: 'POST',
  });
}

export async function exchangeNativeCode(
  code: string,
): Promise<{ token: string; user: User }> {
  return apiFetch<{ token: string; user: User }>('/api/auth/native/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>('/api/auth/logout', { method: 'POST' });
}
