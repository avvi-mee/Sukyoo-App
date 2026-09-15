// Redacts personally-identifying and secret-shaped values before they reach
// Sentry. Sentry's own defaults are the problem, not app-level logging: the
// breadcrumb integration records every fetch/XHR URL, and PostgREST puts row
// filters (owner_id=eq.<uuid>, vital_type=eq.blood_sugar) in the query
// string; Storage signed URLs carry a live download grant in `token=`. See
// docs/SECURITY.md's threat #3 and apps/*/src/observability/sentry.ts.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const EMAIL_RE = /[^\s@"']+@[^\s@"']+\.[^\s@"']+/g;
// Indian mobile numbers (optionally +91-prefixed) and generic 10-digit runs.
const PHONE_RE = /(\+?91[-\s]?)?\b\d{10}\b/g;
// JWTs (three base64url segments) and generic "Bearer <token>" strings.
const TOKEN_RE = /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{10,}\b|Bearer\s+\S+/gi;

const SENSITIVE_KEYS = new Set([
  'email',
  'phone',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'apikey',
  'api_key',
]);

export function scrubText(value: string): string;
export function scrubText(value: string | undefined): string | undefined;
export function scrubText(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value
    .replace(TOKEN_RE, '[redacted-token]')
    .replace(EMAIL_RE, '[redacted-email]')
    .replace(UUID_RE, '[redacted-uuid]')
    .replace(PHONE_RE, '[redacted-phone]');
}

// Strips the query string outright — PostgREST filters and Storage signed
// URLs both live there — and scrubs the path too, since a Storage path is
// "<owner_id>/<filename>", a UUID sitting outside any query string.
export function scrubUrl(url: string): string {
  const [path] = url.split('?');
  return scrubText(path);
}

export function scrubDeep(value: unknown): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (Array.isArray(value)) return value.map(scrubDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        out[key] = '[redacted]';
      } else if (typeof v === 'string' && /url/i.test(key)) {
        out[key] = scrubUrl(v);
      } else {
        out[key] = scrubDeep(v);
      }
    }
    return out;
  }
  return value;
}

const DROPPED_BREADCRUMB_CATEGORIES = new Set(['console']);

export function shouldDropBreadcrumb(category: string | undefined, level: string | undefined): boolean {
  if (category && DROPPED_BREADCRUMB_CATEGORIES.has(category)) return true;
  if (level === 'debug') return true;
  return false;
}
