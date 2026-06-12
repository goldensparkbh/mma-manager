import { access } from "fs/promises";
import path from "path";
import type { RequestHandler } from "express";
import express from "express";
import {
  getObjectStoragePublicBase,
  isObjectStorageEnabled,
  publicUrlForUploadPath,
} from "./objectStorage.js";
import { getUploadDir } from "./storage.js";

/** Serve local uploads, or redirect to Spaces CDN when the file is not on disk. */
export function createUploadsMiddleware(): RequestHandler[] {
  const redirectOrLocal: RequestHandler = async (req, res, next) => {
    const rel = req.path.replace(/^\//, "");
    if (!rel || rel.includes("..")) return next();

    const localPath = path.join(getUploadDir(), rel);
    try {
      await access(localPath);
      return next();
    } catch {
      // not on local disk
    }

    if (isObjectStorageEnabled()) {
      const remote = publicUrlForUploadPath(`/uploads/${rel}`);
      if (remote) return res.redirect(302, remote);
    }

    return res.status(404).end();
  };

  return [redirectOrLocal, express.static(getUploadDir())];
}

export function logUploadStorageMode() {
  if (isObjectStorageEnabled()) {
    console.log(`Uploads: DigitalOcean Spaces (${process.env.SPACES_BUCKET})`);
    return;
  }
  console.log(`Uploads: local disk (${getUploadDir()}) — use Spaces or a persistent volume in production`);
}
