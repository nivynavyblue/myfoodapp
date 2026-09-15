/**
 * Adds `https://` when the user typed a bare domain (e.g. "pizzaplace.com"),
 * then validates the result actually parses as an http(s) URL. Returns null
 * for anything else (e.g. `javascript:`, `data:`) — never renderable as-is.
 */
export function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Defense-in-depth for values already in the DB (e.g. written outside the app). */
export function isSafeHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
