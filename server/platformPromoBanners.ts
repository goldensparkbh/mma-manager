import { query } from "./db/index.js";
import { deleteFile } from "./storage.js";

export const PLATFORM_UPLOAD_TENANT = "_platform";
export type PromoBannerLocale = "en" | "ar";

export type PromoBannerRecord = {
  id: string;
  sortOrder: number;
  locale: PromoBannerLocale;
  imageUrl: string;
  clubTypeId: string | null;
  linkUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Keep upload paths relative so web admin and mobile can resolve against their own origin/API. */
export function normalizeUploadPath(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("/uploads/")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/uploads/")) return parsed.pathname;
  } catch {
    // not a URL
  }
  return trimmed;
}

function normalizeLocale(locale?: string | null): PromoBannerLocale {
  return locale === "ar" ? "ar" : "en";
}

function mapRow(row: Record<string, unknown>): PromoBannerRecord {
  return {
    id: row.id as string,
    sortOrder: Number(row.sort_order),
    locale: normalizeLocale(row.locale as string),
    imageUrl: normalizeUploadPath(String(row.image_url)),
    clubTypeId: (row.club_type_id as string | null) ?? null,
    linkUrl: (row.link_url as string | null) ?? null,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const SELECT_COLS =
  "id, sort_order, locale, image_url, club_type_id, link_url, is_active, created_at, updated_at";

export async function listPublicPromoBanners(locale: PromoBannerLocale) {
  const result = await query(
    `SELECT ${SELECT_COLS}
     FROM platform_promo_banners
     WHERE is_active = true AND locale = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [locale],
  );
  return result.rows.map((row) => mapRow(row as Record<string, unknown>));
}

export async function listAllPromoBanners() {
  const result = await query(
    `SELECT ${SELECT_COLS}
     FROM platform_promo_banners
     ORDER BY locale ASC, sort_order ASC, created_at ASC`,
  );
  return result.rows.map((row) => mapRow(row as Record<string, unknown>));
}

export async function createPromoBanner(data: {
  imageUrl: string;
  locale: PromoBannerLocale;
  clubTypeId?: string | null;
  linkUrl?: string | null;
}) {
  const locale = normalizeLocale(data.locale);
  const next = await query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM platform_promo_banners WHERE locale = $1`,
    [locale],
  );
  const sortOrder = Number(next.rows[0]?.next ?? 0);
  const result = await query(
    `INSERT INTO platform_promo_banners (sort_order, locale, image_url, club_type_id, link_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${SELECT_COLS}`,
    [sortOrder, locale, normalizeUploadPath(data.imageUrl), data.clubTypeId || null, data.linkUrl || null],
  );
  return mapRow(result.rows[0] as Record<string, unknown>);
}

export async function updatePromoBanner(
  id: string,
  data: Partial<{
    imageUrl: string;
    locale: PromoBannerLocale;
    clubTypeId: string | null;
    linkUrl: string | null;
    isActive: boolean;
  }>,
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.imageUrl !== undefined) {
    fields.push(`image_url = $${i++}`);
    values.push(normalizeUploadPath(data.imageUrl));
  }
  if (data.locale !== undefined) {
    fields.push(`locale = $${i++}`);
    values.push(normalizeLocale(data.locale));
  }
  if (data.clubTypeId !== undefined) {
    fields.push(`club_type_id = $${i++}`);
    values.push(data.clubTypeId);
  }
  if (data.linkUrl !== undefined) {
    fields.push(`link_url = $${i++}`);
    values.push(data.linkUrl);
  }
  if (data.isActive !== undefined) {
    fields.push(`is_active = $${i++}`);
    values.push(data.isActive);
  }
  if (!fields.length) {
    const existing = await query(`SELECT ${SELECT_COLS} FROM platform_promo_banners WHERE id = $1`, [id]);
    if (!existing.rows[0]) return null;
    return mapRow(existing.rows[0] as Record<string, unknown>);
  }
  fields.push("updated_at = NOW()");
  values.push(id);
  const result = await query(
    `UPDATE platform_promo_banners SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING ${SELECT_COLS}`,
    values,
  );
  if (!result.rows[0]) return null;
  return mapRow(result.rows[0] as Record<string, unknown>);
}

export async function deletePromoBanner(id: string) {
  const existing = await query(`SELECT image_url FROM platform_promo_banners WHERE id = $1`, [id]);
  if (!existing.rows[0]) return false;
  await query(`DELETE FROM platform_promo_banners WHERE id = $1`, [id]);
  const imageUrl = normalizeUploadPath(String(existing.rows[0].image_url));
  if (imageUrl.startsWith("/uploads/")) await deleteFile(imageUrl);
  return true;
}

export async function reorderPromoBanners(locale: PromoBannerLocale, orderedIds: string[]) {
  const loc = normalizeLocale(locale);
  for (let index = 0; index < orderedIds.length; index++) {
    await query(
      `UPDATE platform_promo_banners SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND locale = $3`,
      [index, orderedIds[index], loc],
    );
  }
}
