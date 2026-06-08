export function parseQrToken(data: string): string {
  const trimmed = data.trim();
  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get("t");
    if (token) return token;
  } catch {
    // not a URL — use raw value
  }
  return trimmed;
}
