import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { deleteObject, isObjectStorageEnabled, putObject } from "./objectStorage.js";

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
  const key = `${tenantId}/${category}/${safeName}`;

  if (isObjectStorageEnabled()) {
    await putObject(key, file.buffer, file.mimetype);
    return `/uploads/${key}`;
  }

  const dir = await ensureUploadDir(path.join(tenantId, category));
  const filePath = path.join(dir, safeName);
  await writeFile(filePath, file.buffer);
  return `/uploads/${key}`;
}

export async function deleteFile(urlPath: string) {
  const normalized = urlPath.startsWith("/uploads/") ? urlPath : null;
  if (!normalized) return;

  const key = normalized.replace(/^\/uploads\//, "");

  if (isObjectStorageEnabled()) {
    try {
      await deleteObject(key);
    } catch {
      // ignore missing remote objects
    }
  }

  const filePath = path.join(UPLOAD_DIR, key);
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
