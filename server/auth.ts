import jwt from "jsonwebtoken";
import bcryptPkg from "bcryptjs";

const bcrypt = (bcryptPkg as typeof bcryptPkg & { default?: typeof bcryptPkg }).default ?? bcryptPkg;
import type { Request, Response, NextFunction } from "express";
import type { AuthPayload } from "./utils.js";
import { hasPlatformPermission } from "../shared/platformPermissions.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRES = /^(\d+[smhdw]|[1-9]\d*\s*(ms|seconds?|minutes?|hours?|days?|weeks?))$/i.test(process.env.JWT_EXPIRES || "")
  ? process.env.JWT_EXPIRES!
  : "7d";

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api")) return next();
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid token" });
  }
  (req as Request & { auth: AuthPayload }).auth = payload;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const payload = verifyToken(header.slice(7));
    if (payload) {
      (req as Request & { auth: AuthPayload }).auth = payload;
    }
  }
  next();
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  const auth = (req as Request & { auth?: AuthPayload }).auth;
  if (!auth?.tenantId) {
    return res.status(403).json({ error: "Tenant access required" });
  }
  next();
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = (req as Request & { auth?: AuthPayload }).auth;
  if (!auth?.isPlatformAdmin) {
    return res.status(403).json({ error: "Platform admin access required" });
  }
  next();
}

export function requirePlatformPermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as Request & { auth?: AuthPayload }).auth;
    if (!auth?.isPlatformAdmin) {
      return res.status(403).json({ error: "Platform admin access required" });
    }
    const userPerms = auth.platformPermissions || ["*"];
    if (permissions.some((p) => hasPlatformPermission(userPerms, p))) return next();
    return res.status(403).json({ error: "Insufficient platform permissions" });
  };
}
