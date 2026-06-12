import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let client: S3Client | null = null;

export function isObjectStorageEnabled(): boolean {
  return Boolean(
    process.env.SPACES_BUCKET &&
      process.env.SPACES_ACCESS_KEY_ID &&
      process.env.SPACES_SECRET_ACCESS_KEY &&
      process.env.SPACES_ENDPOINT,
  );
}

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.SPACES_ENDPOINT,
      region: process.env.SPACES_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.SPACES_ACCESS_KEY_ID!,
        secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: false,
    });
  }
  return client;
}

export function getObjectStoragePublicBase(): string | null {
  if (!isObjectStorageEnabled()) return null;
  if (process.env.SPACES_CDN_URL?.trim()) {
    return process.env.SPACES_CDN_URL.trim().replace(/\/$/, "");
  }
  const endpoint = process.env.SPACES_ENDPOINT!.replace(/\/$/, "");
  return `${endpoint}/${process.env.SPACES_BUCKET}`;
}

export function uploadKeyFromPath(urlPath: string): string | null {
  if (!urlPath.startsWith("/uploads/")) return null;
  return urlPath.replace(/^\/uploads\//, "");
}

export async function putObject(key: string, body: Buffer, contentType?: string) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: process.env.SPACES_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
      ACL: "public-read",
    }),
  );
}

export async function deleteObject(key: string) {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: process.env.SPACES_BUCKET!,
      Key: key,
    }),
  );
}

export function publicUrlForUploadPath(urlPath: string): string | null {
  const key = uploadKeyFromPath(urlPath);
  if (!key) return null;
  const base = getObjectStoragePublicBase();
  if (!base) return null;
  return `${base}/${key}`;
}
