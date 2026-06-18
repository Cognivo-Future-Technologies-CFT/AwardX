const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when value is a real persisted UUID (not a client-side temp id). */
export function isPersistedUuid(value?: string | null): value is string {
  if (!value || value.startsWith('temp-')) return false;
  return UUID_RE.test(value);
}
