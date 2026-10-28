import { API_URL } from '@/lib/api-url';

import { unwrapApiResponse, type ApiResponse } from './response';

const REQUEST_TIMEOUT_MS = 15_000;

let authToken: string | null = null;
const unauthorizedListeners = new Set<() => void>();

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function setApiToken(token: string | null): void {
  authToken = token;
}

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

    if (!response.ok) {
      const code = payload?.code === undefined ? `http_${response.status}` : String(payload.code);
      const message = payload?.message ?? '请求失败，请稍后重试';
      if (response.status === 401) {
        unauthorizedListeners.forEach((listener) => listener());
      }
      throw new ApiError(response.status, code, message);
    }

    if (payload === null) {
      throw new ApiError(response.status, 'invalid_response', '服务器响应格式不正确');
    }
    return unwrapApiResponse(payload);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'timeout', '请求超时，请检查网络后重试');
    }
    throw new ApiError(0, 'network_error', '连接不上服务器，请确认 API 已启动');
  } finally {
    clearTimeout(timer);
  }
}
