import { getApiUrl } from "./config";

/** Turn relative asset paths from the API into absolute URLs for Image components. */
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const base = getApiUrl();
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}
