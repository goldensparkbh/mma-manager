import type { Request } from "express";

export function toCamelCase<T extends Record<string, unknown>>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    if (value instanceof Date) {
      result[camelKey] = value.toISOString();
    } else {
      result[camelKey] = value;
    }
  }
  return result as T;
}

export function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => toCamelCase<T>(r));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function uniqueSlug(base: string, check: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = slugify(base);
  let attempt = slug;
  let counter = 1;
  while (await check(attempt)) {
    attempt = `${slug}-${counter++}`;
  }
  return attempt;
}

export function formatDate(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).split("T")[0];
}

export function formatTimestamp(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export interface AuthPayload {
  userId: string;
  tenantId: string | null;
  email: string;
  role: string;
  isPlatformAdmin: boolean;
  platformPermissions?: string[];
  impersonatedBy?: string | null;
  accountType?: "staff" | "member";
  memberId?: string;
}

export function getAuth(req: Request): AuthPayload {
  return (req as Request & { auth: AuthPayload }).auth;
}
