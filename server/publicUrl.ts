/** Base URL for publicly reachable assets (logos, club-type icons, uploads). */
export function getPublicBaseUrl(): string {
  const port = process.env.PORT || "3000";
  return (process.env.APP_URL || process.env.CORS_ORIGIN || `http://localhost:${port}`).replace(/\/$/, "");
}

export function resolvePublicAssetUrl(
  url: string | null | undefined,
  clubType?: string | null,
): string | null {
  const fallback = clubType ? `/club-types/${clubType}.png` : null;
  const raw = (url?.trim() || fallback)?.trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  const base = getPublicBaseUrl();
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}
