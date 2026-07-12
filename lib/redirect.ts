/**
 * Validates that a callback URL is safe to redirect to internally.
 * Rejects absolute URLs, protocol-relative URLs (`//evil.com`),
 * backslash tricks, and anything that isn't a same-app path.
 */
export function getSafeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!candidate) return fallback;

  // Must start with exactly one '/', never '//' or '/\'.
  if (!/^\/(?!\/|\\)/.test(candidate)) return fallback;

  // Reject anything containing a scheme or backslash anywhere else.
  if (/[\\]/.test(candidate)) return fallback;
  if (/^\/\s*[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) return fallback;

  try {
    // Resolving against a fixed dummy origin neutralizes scheme tricks
    // while still letting us confirm the result stayed same-origin/path-only.
    const url = new URL(candidate, "https://internal.invalid");
    if (url.origin !== "https://internal.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
