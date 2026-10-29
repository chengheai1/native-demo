const URL_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;
const HTTP_SCHEME = /^https?:\/\//i;
const DOMAIN = /^(?:[a-z\d\u00a1-\uffff](?:[a-z\d\u00a1-\uffff-]{0,61}[a-z\d\u00a1-\uffff])?\.)+[a-z\u00a1-\uffff]{2,}\.?(?::\d{1,5})?$/i;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}(?::\d{1,5})?$/;
const LOCALHOST = /^localhost(?::\d{1,5})?$/i;

/**
 * Turns the address bar text into a loadable http(s) URL.
 * Returns `null` for empty input, whitespace, non-http(s) schemes and hosts that are not
 * a domain, an IPv4 address or localhost.
 */
export function normalizeWebViewUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;

  const candidate = URL_SCHEME.test(value) ? value : `https://${value}`;
  if (!HTTP_SCHEME.test(candidate)) return null;

  const authority = candidate.slice(candidate.indexOf('://') + 3).split(/[/?#]/, 1)[0];
  if (!authority) return null;

  const host = authority.replace(/^.*@/, '');
  if (!DOMAIN.test(host) && !IPV4.test(host) && !LOCALHOST.test(host)) return null;

  return candidate;
}
