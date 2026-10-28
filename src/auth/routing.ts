export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'error';

export function getTodosRedirect(status: AuthStatus): '/login' | null {
  return status === 'signedOut' || status === 'error' ? '/login' : null;
}
