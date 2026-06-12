/** Base URL for publicly reachable assets (logos, club-type icons, uploads). */
export function getPublicBaseUrl(): string {
  const port = process.env.PORT || "3000";
  const candidates = [
    process.env.APP_URL,
    process.env.CORS_ORIGIN,
    process.env.PUBLIC_APP_URL,
  ]
    .filter((v): v is string => !!v?.trim())
    .map((v) => v.trim().replace(/\/$/, ""));

  const nonLocal = candidates.find(
    (c) => !c.includes("localhost") && !c.includes("127.0.0.1"),
  );
  if (nonLocal) return nonLocal;
  if (candidates[0]) return candidates[0];
  return `http://localhost:${port}`;
}

/** Normalize stored asset paths; prefer relative paths for same-origin assets. */
export function normalizeAssetPath(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (isLocal && parsed.pathname.startsWith("/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function resolvePublicAssetUrl(
  url: string | null | undefined,
  clubType?: string | null,
): string | null {
  const fallback = clubType ? `/club-types/${clubType}.png` : null;
  const normalized = normalizeAssetPath(url?.trim() || fallback);
  if (!normalized) return null;
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }
  const base = getPublicBaseUrl();
  return `${base}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

/** Relative path for mobile clients (they attach their own API base URL). */
export function resolvePublicAssetPath(
  url: string | null | undefined,
  clubType?: string | null,
): string | null {
  const fallback = clubType ? `/club-types/${clubType}.png` : null;
  return normalizeAssetPath(url?.trim() || fallback);
}
