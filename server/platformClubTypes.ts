import { access, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getAllClubTypes } from "../shared/clubTypes.js";
import { query } from "./db/index.js";
import { ensureUploadDir } from "./storage.js";
import { isObjectStorageEnabled, putObject } from "./objectStorage.js";
import { resolvePublicAssetPath } from "./publicUrl.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_CLUB_TYPES_DIR = path.resolve(__dirname, "..", "client", "public", "club-types");
export const PLATFORM_CLUB_TYPE_UPLOAD_TENANT = "_platform";

export type PlatformClubTypeRecord = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
  category: string;
  sortOrder: number;
  isActive: boolean;
};

export type PublicClubTypeOption = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: string;
  imageUrl: string | null;
  progressionEnabled: boolean;
  hasSessionPackages: boolean;
};

function mapRow(row: Record<string, unknown>): PlatformClubTypeRecord {
  return {
    id: String(row.id),
    nameEn: String(row.name_en),
    nameAr: String(row.name_ar),
    descriptionEn: (row.description_en as string | null) ?? null,
    descriptionAr: (row.description_ar as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    category: String(row.category),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: row.is_active !== false,
  };
}

async function copyStaticClubTypeImage(id: string): Promise<string> {
  const staticFile = path.join(STATIC_CLUB_TYPES_DIR, `${id}.png`);
  try {
    await access(staticFile);
  } catch {
    return `/club-types/${id}.png`;
  }

  const key = `${PLATFORM_CLUB_TYPE_UPLOAD_TENANT}/club-types/${id}.png`;
  const buffer = await readFile(staticFile);

  if (isObjectStorageEnabled()) {
    await putObject(key, buffer, "image/png");
    return `/uploads/${key}`;
  }

  const dir = await ensureUploadDir(path.join(PLATFORM_CLUB_TYPE_UPLOAD_TENANT, "club-types"));
  const { writeFile } = await import("fs/promises");
  await writeFile(path.join(dir, `${id}.png`), buffer);

  return `/uploads/${key}`;
}

/** Seed / refresh catalog rows from code templates; upload static images on first insert. */
export async function syncPlatformClubTypes() {
  const templates = getAllClubTypes();
  let sort = 0;
  for (const t of templates) {
    const imageUrl = await copyStaticClubTypeImage(t.id);
    await query(
      `INSERT INTO platform_club_types
         (id, name_en, name_ar, description_en, description_ar, image_url, category, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
       ON CONFLICT (id) DO UPDATE SET
         name_en = EXCLUDED.name_en,
         name_ar = EXCLUDED.name_ar,
         description_en = EXCLUDED.description_en,
         description_ar = EXCLUDED.description_ar,
         category = EXCLUDED.category,
         sort_order = EXCLUDED.sort_order,
         image_url = COALESCE(platform_club_types.image_url, EXCLUDED.image_url),
         updated_at = NOW()`,
      [
        t.id,
        t.nameEn,
        t.nameAr,
        t.descriptionEn,
        t.descriptionAr,
        imageUrl,
        t.category,
        sort++,
      ],
    );
  }
}

export async function listPlatformClubTypes(): Promise<PlatformClubTypeRecord[]> {
  const result = await query(
    `SELECT id, name_en, name_ar, description_en, description_ar, image_url, category, sort_order, is_active
     FROM platform_club_types
     ORDER BY sort_order ASC, name_en ASC`,
  );
  return result.rows.map((row) => mapRow(row as Record<string, unknown>));
}

export async function updatePlatformClubType(
  id: string,
  data: Partial<{
    nameEn: string;
    nameAr: string;
    descriptionEn: string | null;
    descriptionAr: string | null;
    imageUrl: string | null;
    isActive: boolean;
    sortOrder: number;
  }>,
): Promise<PlatformClubTypeRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [id];
  let idx = 2;

  const map: Record<string, string> = {
    nameEn: "name_en",
    nameAr: "name_ar",
    descriptionEn: "description_en",
    descriptionAr: "description_ar",
    imageUrl: "image_url",
    isActive: "is_active",
    sortOrder: "sort_order",
  };

  for (const [key, col] of Object.entries(map)) {
    if (key in data) {
      fields.push(`${col} = $${idx++}`);
      values.push((data as Record<string, unknown>)[key]);
    }
  }

  if (!fields.length) return (await listPlatformClubTypes()).find((r) => r.id === id) ?? null;

  fields.push("updated_at = NOW()");
  const result = await query(
    `UPDATE platform_club_types SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    values,
  );
  return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
}

export async function listPublicClubTypes(): Promise<PublicClubTypeOption[]> {
  const templates = getAllClubTypes();
  const catalogRows = await listPlatformClubTypes();
  const catalog = new Map(catalogRows.map((r) => [r.id, r]));

  const merged = templates
    .map((t, index) => {
      const row = catalog.get(t.id);
      if (row && !row.isActive) return null;
      const imagePath = row?.imageUrl ?? `/club-types/${t.id}.png`;
      return {
        id: t.id,
        nameEn: row?.nameEn ?? t.nameEn,
        nameAr: row?.nameAr ?? t.nameAr,
        descriptionEn: row?.descriptionEn ?? t.descriptionEn,
        descriptionAr: row?.descriptionAr ?? t.descriptionAr,
        category: row?.category ?? t.category,
        imageUrl: resolvePublicAssetPath(imagePath),
        progressionEnabled: t.progressionConfig.enabled,
        hasSessionPackages: t.defaultPackages.some((p) => p.packageType === "sessions"),
        sortOrder: row?.sortOrder ?? index,
      };
    })
    .filter(Boolean) as Array<PublicClubTypeOption & { sortOrder: number }>;

  merged.sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn));
  return merged.map(({ sortOrder: _s, ...rest }) => rest);
}
