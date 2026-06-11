import { format as dateFnsFormat, isSameDay as dateFnsIsSameDay, parseISO, type Locale } from "date-fns";

export function parseDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse ISO date strings safely (returns null for invalid). */
export function safeParseISO(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const str = String(value).trim();
  if (!str) return null;
  const d = parseISO(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function safeIsSameDay(a: unknown, b: unknown): boolean {
  const da = a instanceof Date ? (Number.isNaN(a.getTime()) ? null : a) : safeParseISO(a);
  const db = b instanceof Date ? (Number.isNaN(b.getTime()) ? null : b) : safeParseISO(b);
  if (!da || !db) return false;
  return dateFnsIsSameDay(da, db);
}

export function safeFormat(
  value: unknown,
  pattern: string,
  options?: { locale?: Locale; fallback?: string },
): string {
  const d = parseDate(value);
  if (!d) return options?.fallback ?? "—";
  return dateFnsFormat(d, pattern, options?.locale ? { locale: options.locale } : undefined);
}
