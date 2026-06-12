import { getApiUrl } from "./config";

function apiBase(): string {
  return getApiUrl().replace(/\/$/, "");
}

/** Rewrite localhost absolute URLs to the configured API host (common when server APP_URL is unset). */
function rewriteLocalhostUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (isLocal) {
      return `${apiBase()}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* ignore invalid URLs */
  }
  return url;
}

/** Turn relative asset paths from the API into absolute URLs for Image components. */
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return rewriteLocalhostUrl(trimmed);
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${apiBase()}${path}`;
}
