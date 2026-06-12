import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let client: S3Client | null = null;

/** Normalize DO Spaces endpoint (must be https://fra1.digitaloceanspaces.com). */
export function normalizeSpacesEndpoint(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  let endpoint = raw.trim().replace(/\/$/, "");
  if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
    endpoint = `https://${endpoint}`;
  }
  // Common typo: spaces.fra1.digitaloceanspaces.com → fra1.digitaloceanspaces.com
  endpoint = endpoint.replace(
    /^https?:\/\/spaces\.([a-z0-9-]+\.digitaloceanspaces\.com)$/i,
    "https://$1",
  );
  return endpoint;
}

export function isObjectStorageEnabled(): boolean {
  return Boolean(
    process.env.SPACES_BUCKET &&
      process.env.SPACES_ACCESS_KEY_ID &&
      process.env.SPACES_SECRET_ACCESS_KEY &&
      normalizeSpacesEndpoint(process.env.SPACES_ENDPOINT),
  );
}

function getClient(): S3Client {
  if (!client) {
    const endpoint = normalizeSpacesEndpoint(process.env.SPACES_ENDPOINT)!;
    client = new S3Client({
      endpoint,
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
  const endpoint = normalizeSpacesEndpoint(process.env.SPACES_ENDPOINT)!;
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
