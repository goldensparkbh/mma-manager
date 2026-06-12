import type { ClubTypeOption } from "./discover";

export function inferClassSportType(className: string, clubTypes: ClubTypeOption[]): string | null {
  const lower = className.toLowerCase();
  let best: { id: string; score: number } | null = null;

  for (const ct of clubTypes) {
    if (ct.nameAr && className.includes(ct.nameAr)) return ct.id;

    const candidates = [
      ct.nameEn.toLowerCase(),
      ct.id.replace(/_/g, " "),
      ...ct.nameEn
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    ];

    for (const candidate of candidates) {
      if (candidate.length >= 3 && lower.includes(candidate)) {
        const score = candidate.length;
        if (!best || score > best.score) best = { id: ct.id, score };
      }
    }
  }

  return best?.id ?? null;
}

export function collectSportTypesFromSchedule(
  schedule: Array<{ name: string }>,
  clubTypes: ClubTypeOption[],
  fallbackClubType?: string | null,
): string[] {
  const types = new Set<string>();
  for (const item of schedule) {
    const matched = inferClassSportType(item.name, clubTypes);
    if (matched) types.add(matched);
    else if (fallbackClubType && fallbackClubType !== "hybrid") types.add(fallbackClubType);
  }
  return [...types];
}

export function filterScheduleBySport<T extends { name: string }>(
  schedule: T[],
  sportType: string,
  clubTypes: ClubTypeOption[],
  fallbackClubType?: string | null,
): T[] {
  if (!sportType) return schedule;
  return schedule.filter((item) => {
    const matched = inferClassSportType(item.name, clubTypes);
    const type = matched ?? (fallbackClubType !== "hybrid" ? fallbackClubType : null);
    return type === sportType;
  });
}
