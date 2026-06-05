import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function ensureUploadDir(subdir: string) {
  const dir = path.join(UPLOAD_DIR, subdir);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveFile(
  tenantId: string,
  category: string,
  file: Express.Multer.File,
  filename?: string,
): Promise<string> {
  const safeName = filename || `${randomUUID()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const subdir = path.join(tenantId, category);
  const dir = await ensureUploadDir(subdir);
  const filePath = path.join(dir, safeName);
  await writeFile(filePath, file.buffer);
  return `/uploads/${tenantId}/${category}/${safeName}`;
}

export async function deleteFile(urlPath: string) {
  if (!urlPath.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOAD_DIR, urlPath.replace("/uploads/", ""));
  try {
    await unlink(filePath);
  } catch {
    // ignore missing files
  }
}

export function getUploadDir() {
  return UPLOAD_DIR;
}

export async function readUploadedFile(urlPath: string): Promise<Buffer | null> {
  if (!urlPath.startsWith("/uploads/")) return null;
  const filePath = path.join(UPLOAD_DIR, urlPath.replace("/uploads/", ""));
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}
