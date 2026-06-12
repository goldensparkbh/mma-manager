import { query } from "./db/index.js";
import { deleteFile } from "./storage.js";
import { resolvePublicAssetUrl } from "./publicUrl.js";

export const PLATFORM_UPLOAD_TENANT = "_platform";

export type PromoBannerRecord = {
  id: string;
  sortOrder: number;
  imageUrl: string;
  clubTypeId: string | null;
  linkUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: Record<string, unknown>): PromoBannerRecord {
  return {
    id: row.id as string,
    sortOrder: Number(row.sort_order),
    imageUrl: row.image_url as string,
    clubTypeId: (row.club_type_id as string | null) ?? null,
    linkUrl: (row.link_url as string | null) ?? null,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function withPublicImageUrl(banner: PromoBannerRecord) {
  return {
    ...banner,
    imageUrl: resolvePublicAssetUrl(banner.imageUrl) || banner.imageUrl,
  };
}

export async function listPublicPromoBanners() {
  const result = await query(
    `SELECT id, sort_order, image_url, club_type_id, link_url, is_active, created_at, updated_at
     FROM platform_promo_banners
     WHERE is_active = true
     ORDER BY sort_order ASC, created_at ASC`,
  );
  return result.rows.map((row) => withPublicImageUrl(mapRow(row as Record<string, unknown>)));
}

export async function listAllPromoBanners() {
  const result = await query(
    `SELECT id, sort_order, image_url, club_type_id, link_url, is_active, created_at, updated_at
     FROM platform_promo_banners
     ORDER BY sort_order ASC, created_at ASC`,
  );
  return result.rows.map((row) => withPublicImageUrl(mapRow(row as Record<string, unknown>)));
}

export async function createPromoBanner(data: {
  imageUrl: string;
  clubTypeId?: string | null;
  linkUrl?: string | null;
}) {
  const next = await query(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM platform_promo_banners`);
  const sortOrder = Number(next.rows[0]?.next ?? 0);
  const result = await query(
    `INSERT INTO platform_promo_banners (sort_order, image_url, club_type_id, link_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, sort_order, image_url, club_type_id, link_url, is_active, created_at, updated_at`,
    [sortOrder, data.imageUrl, data.clubTypeId || null, data.linkUrl || null],
  );
  return withPublicImageUrl(mapRow(result.rows[0] as Record<string, unknown>));
}

export async function updatePromoBanner(
  id: string,
  data: Partial<{ imageUrl: string; clubTypeId: string | null; linkUrl: string | null; isActive: boolean }>,
) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.imageUrl !== undefined) {
    fields.push(`image_url = $${i++}`);
    values.push(data.imageUrl);
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
    const existing = await query(
      `SELECT id, sort_order, image_url, club_type_id, link_url, is_active, created_at, updated_at
       FROM platform_promo_banners WHERE id = $1`,
      [id],
    );
    if (!existing.rows[0]) return null;
    return withPublicImageUrl(mapRow(existing.rows[0] as Record<string, unknown>));
  }
  fields.push("updated_at = NOW()");
  values.push(id);
  const result = await query(
    `UPDATE platform_promo_banners SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, sort_order, image_url, club_type_id, link_url, is_active, created_at, updated_at`,
    values,
  );
  if (!result.rows[0]) return null;
  return withPublicImageUrl(mapRow(result.rows[0] as Record<string, unknown>));
}

export async function deletePromoBanner(id: string) {
  const existing = await query(`SELECT image_url FROM platform_promo_banners WHERE id = $1`, [id]);
  if (!existing.rows[0]) return false;
  await query(`DELETE FROM platform_promo_banners WHERE id = $1`, [id]);
  const imageUrl = existing.rows[0].image_url as string;
  if (imageUrl.startsWith("/uploads/")) await deleteFile(imageUrl);
  return true;
}

export async function reorderPromoBanners(orderedIds: string[]) {
  for (let index = 0; index < orderedIds.length; index++) {
    await query(`UPDATE platform_promo_banners SET sort_order = $1, updated_at = NOW() WHERE id = $2`, [
      index,
      orderedIds[index],
    ]);
  }
}
