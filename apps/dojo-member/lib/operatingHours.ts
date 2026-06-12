export const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type DayHours = {
  open?: string | null;
  close?: string | null;
  closed?: boolean;
};

export type OperatingHours = Partial<Record<WeekdayKey, DayHours>>;

export function parseOperatingHours(raw: unknown): OperatingHours | null {
  if (!raw || typeof raw !== "object") return null;
  const out: OperatingHours = {};
  for (const key of WEEKDAY_KEYS) {
    const day = (raw as Record<string, unknown>)[key];
    if (!day || typeof day !== "object") continue;
    const d = day as Record<string, unknown>;
    out[key] = {
      open: typeof d.open === "string" ? d.open : null,
      close: typeof d.close === "string" ? d.close : null,
      closed: d.closed === true,
    };
  }
  return Object.keys(out).length ? out : null;
}

export function deriveHoursFromSchedule(
  sessions: Array<{ startsAt: string; endsAt?: string | null }>,
): OperatingHours | null {
  const ranges = new Map<number, { open: string; close: string }>();
  for (const session of sessions) {
    const start = new Date(session.startsAt);
    if (Number.isNaN(start.getTime())) continue;
    const day = start.getDay();
    const open = formatHm(start);
    const close = session.endsAt ? formatHm(new Date(session.endsAt)) : open;
    const prev = ranges.get(day);
    if (!prev) {
      ranges.set(day, { open, close });
      continue;
    }
    if (open < prev.open) prev.open = open;
    if (close > prev.close) prev.close = close;
  }
  if (!ranges.size) return null;
  const out: OperatingHours = {};
  for (const [day, range] of ranges) {
    out[WEEKDAY_KEYS[day]] = { open: range.open, close: range.close };
  }
  return out;
}

function formatHm(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatDayHours(day: DayHours | undefined, closedLabel: string): string {
  if (!day || day.closed) return closedLabel;
  if (day.open && day.close) return `${day.open} – ${day.close}`;
  if (day.open) return day.open;
  return "—";
}
