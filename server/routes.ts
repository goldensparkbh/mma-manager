import { Router, type Request, type Response } from "express";
import multer from "multer";
import { authMiddleware, requireTenant, requirePlatformAdmin, requirePlatformPermission, requireMemberAccount, requireStaffAccount, signToken, comparePassword, hashPassword, optionalAuth } from "./auth.js";
import * as bookings from "./bookings.js";
import { PLATFORM_PERMISSIONS } from "../shared/platformPermissions.js";
import { isTapConfigured } from "./tap.js";
import { getAuth } from "./utils.js";
import { query } from "./db/index.js";
import { toCamelCase, rowsToCamel } from "./utils.js";
import { saveFile } from "./storage.js";
import * as data from "./data.js";
import { getAllClubTypes } from "../shared/clubTypes.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const router = Router();

// ─── Public ────────────────────────────────────────────────────────────────

router.get("/api/health", (_req, res) => res.json({ ok: true }));

router.get("/api/plans", async (_req, res) => {
  const plans = await data.getSubscriptionPlans(true);
  res.json(plans);
});

router.get("/api/club-types", (_req, res) => {
  res.json(getAllClubTypes().map((t) => ({
    id: t.id,
    nameEn: t.nameEn,
    nameAr: t.nameAr,
    descriptionEn: t.descriptionEn,
    descriptionAr: t.descriptionAr,
    category: t.category,
    progressionEnabled: t.progressionConfig.enabled,
    hasSessionPackages: t.defaultPackages.some((p) => p.packageType === "sessions"),
  })));
});

router.post("/api/webhooks/tap", async (req, res) => {
  try {
    const chargeId = req.body?.id as string;
    if (!chargeId) return res.status(400).json({ error: "Missing charge id" });
    const result = await data.confirmPlatformPayment(chargeId);
    res.json(result);
  } catch (err) {
    console.error("TAP webhook error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/api/settings/public", optionalAuth, async (req, res) => {
  const auth = (req as Request & { auth?: ReturnType<typeof getAuth> }).auth;
  if (!auth?.tenantId) return res.json({ name: "Dojo Manager" });
  const settings = await data.getSettings(auth.tenantId);
  res.json(settings || { name: "Dojo Manager" });
});

// ─── Member portal (public) ─────────────────────────────────────────────────

router.get("/api/portal/:slug/info", async (req, res) => {
  try {
    const tenant = await bookings.getTenantByPortalSlug(req.params.slug);
    if (!tenant) return res.status(404).json({ error: "Club not found" });
    const settings = await bookings.getBookingSettings(tenant.id as string);
    res.json({
      name: tenant.name,
      slug: tenant.slug,
      portalEnabled: settings.portalEnabled,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/api/portal/:slug/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: "Phone and password required" });
    const result = await data.portalLogin(req.params.slug, phone, password);
    const token = signToken({
      userId: result.accountId,
      tenantId: result.tenantId,
      memberId: result.memberId,
      email: result.phone,
      role: "member",
      isPlatformAdmin: false,
      accountType: "member",
    });
    res.json({
      token,
      member: { id: result.memberId, name: result.memberName, phone: result.phone },
      tenant: { id: result.tenantId, name: result.tenantName, slug: result.tenantSlug },
    });
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
});

router.post("/api/auth/register", async (req, res) => {
  try {
    const { clubName, email, password, adminName, phone, planSlug, clubType } = req.body;
    if (!clubName || !email || !password || !adminName) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existing = await query("SELECT u.id FROM users u WHERE u.email = $1", [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already registered" });

    const { tenant, user } = await data.provisionTenant({ clubName, email, password, adminName, phone, planSlug, clubType });
    const token = signToken({
      userId: user.id as string,
      tenantId: tenant.id as string,
      email: email,
      role: "admin",
      isPlatformAdmin: false,
      accountType: "staff",
    });
    res.status(201).json({ token, tenant, user: { id: user.id, email: user.email, displayName: user.displayName, role: "admin" } });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: (err as Error).message || "Registration failed" });
  }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    // Platform admin login (checked before tenant users)
    const adminResult = await query("SELECT * FROM platform_admins WHERE email = $1", [email]);
    if (adminResult.rows[0]) {
      const valid = await comparePassword(password, adminResult.rows[0].password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      const admin = toCamelCase(adminResult.rows[0]);
      if (admin.isActive === false) return res.status(403).json({ error: "Platform admin account is inactive" });
      const permissions = await data.getPlatformAdminPermissions(admin.id as string);
      const token = signToken({
        userId: admin.id as string,
        tenantId: null,
        email: admin.email as string,
        role: admin.roleId as string || "platform_admin",
        isPlatformAdmin: true,
        platformPermissions: permissions,
      });
      return res.json({
        token,
        user: {
          id: admin.id,
          email: admin.email,
          displayName: admin.displayName,
          role: admin.roleId || "platform_admin",
          isPlatformAdmin: true,
          platformPermissions: permissions,
        },
      });
    }

    // Tenant user login
    const userResult = await query(
      `SELECT u.*, t.status as tenant_status, t.trial_ends_at, t.name as tenant_name, t.slug as tenant_slug
       FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.email = $1`,
      [email],
    );
    if (!userResult.rows[0]) return res.status(401).json({ error: "Invalid credentials" });

    const row = userResult.rows[0];
    const valid = await comparePassword(password, row.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    await query("UPDATE users SET last_login = NOW() WHERE id = $1", [row.id]);
    const user = toCamelCase(row);
    const token = signToken({
      userId: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      role: row.role,
      isPlatformAdmin: false,
      accountType: "staff",
    });
    const subscription = await data.getTenantSubscription(row.tenant_id);
    const access = await data.checkTenantAccess(row.tenant_id);
    res.json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, tenantId: user.tenantId },
      tenant: {
        id: user.tenantId,
        name: user.tenantName,
        slug: user.tenantSlug,
        status: user.tenantStatus,
        trialEndsAt: user.trialEndsAt ? String(user.trialEndsAt) : null,
      },
      subscription,
      subscriptionActive: access.allowed,
      subscriptionBlockReason: access.allowed ? null : access.code,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── Auth required ─────────────────────────────────────────────────────────

router.use(authMiddleware);

// ─── Member portal (authenticated) ─────────────────────────────────────────

router.get("/api/portal/me", requireMemberAccount, async (req, res) => {
  const auth = getAuth(req);
  const profile = await data.getPortalMemberProfile(auth.tenantId!, auth.memberId!);
  if (!profile) return res.status(404).json({ error: "Member not found" });
  res.json(profile);
});

router.get("/api/portal/classes", requireMemberAccount, async (req, res) => {
  const auth = getAuth(req);
  const from = (req.query.from as string) || new Date().toISOString();
  const to = (req.query.to as string) || new Date(Date.now() + 14 * 86400000).toISOString();
  const sessions = await data.getClassSessions(auth.tenantId!, from, to);
  const active = sessions.filter((s) => (s as { status?: string }).status === "scheduled");
  res.json(active);
});

router.get("/api/portal/bookings", requireMemberAccount, async (req, res) => {
  const auth = getAuth(req);
  res.json(await bookings.getBookings(auth.tenantId!, { memberId: auth.memberId }));
});

router.post("/api/portal/bookings", requireMemberAccount, async (req, res) => {
  try {
    const auth = getAuth(req);
    const member = await data.getMember(auth.tenantId!, auth.memberId!);
    if (!member) return res.status(404).json({ error: "Member not found" });
    const booking = await bookings.createBooking({
      tenantId: auth.tenantId!,
      sessionId: req.body.sessionId,
      memberId: auth.memberId!,
      memberName: (member as { name: string }).name,
      bookedBy: "member",
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/api/portal/bookings/:id", requireMemberAccount, async (req, res) => {
  try {
    const auth = getAuth(req);
    const list = await bookings.getBookings(auth.tenantId!, { memberId: auth.memberId });
    const owns = list.some((b) => (b as { id: string }).id === req.params.id);
    if (!owns) return res.status(404).json({ error: "Booking not found" });
    await bookings.cancelBooking(auth.tenantId!, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/api/auth/me", async (req, res) => {
  const auth = getAuth(req);
  if (auth.accountType === "member") {
    const profile = await data.getPortalMemberProfile(auth.tenantId!, auth.memberId!);
    if (!profile) return res.status(404).json({ error: "Member not found" });
    return res.json({
      accountType: "member",
      member: profile.member,
      activeSubscription: profile.activeSubscription,
    });
  }
  if (auth.isPlatformAdmin) {
    const result = await query("SELECT id, email, display_name FROM platform_admins WHERE id = $1", [auth.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    const user = toCamelCase(result.rows[0]);
    return res.json({ user: { ...user, role: "platform_admin", isPlatformAdmin: true } });
  }
  const result = await query(
    `SELECT u.id, u.email, u.display_name, u.role, u.tenant_id,
            t.name as tenant_name, t.slug, t.status as tenant_status, t.trial_ends_at
     FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id = $1`,
    [auth.userId],
  );
  if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
  const user = toCamelCase(result.rows[0]);
  const subscription = await data.getTenantSubscription(auth.tenantId!);
  const permissions = user.role === "admin" ? ["*"] : await getRolePermissions(auth.tenantId!, user.role as string);
  const access = await data.checkTenantAccess(auth.tenantId!);
  res.json({
    user,
    tenant: {
      id: user.tenantId,
      name: user.tenantName,
      slug: user.slug,
      status: user.tenantStatus,
      trialEndsAt: user.trialEndsAt ? String(user.trialEndsAt) : null,
    },
    subscription,
    permissions,
    subscriptionActive: access.allowed,
    subscriptionBlockReason: access.allowed ? null : access.code,
  });
});

router.patch("/api/auth/password", requireTenant, async (req, res) => {
  const auth = getAuth(req);
  const { currentPassword, newPassword } = req.body;
  const result = await query("SELECT password_hash FROM users WHERE id = $1 AND tenant_id = $2", [auth.userId, auth.tenantId]);
  if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
  const valid = await comparePassword(currentPassword, result.rows[0].password_hash);
  if (!valid) return res.status(400).json({ error: "Current password incorrect" });
  const hash = await hashPassword(newPassword);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, auth.userId]);
  res.json({ ok: true });
});

router.post("/api/auth/verify-password", async (req, res) => {
  const auth = getAuth(req);
  const { password } = req.body;
  if (auth.isPlatformAdmin) {
    const result = await query("SELECT password_hash FROM platform_admins WHERE id = $1", [auth.userId]);
    const valid = await comparePassword(password, result.rows[0]?.password_hash);
    return valid ? res.json({ ok: true }) : res.status(401).json({ error: "Invalid password" });
  }
  const result = await query("SELECT password_hash FROM users WHERE id = $1", [auth.userId]);
  const valid = await comparePassword(password, result.rows[0]?.password_hash);
  return valid ? res.json({ ok: true }) : res.status(401).json({ error: "Invalid password" });
});

router.patch("/api/auth/email", requireTenant, async (req, res) => {
  const auth = getAuth(req);
  const { email, password } = req.body;
  const result = await query("SELECT password_hash FROM users WHERE id = $1", [auth.userId]);
  const valid = await comparePassword(password, result.rows[0].password_hash);
  if (!valid) return res.status(400).json({ error: "Password incorrect" });
  await query("UPDATE users SET email = $1 WHERE id = $2", [email, auth.userId]);
  res.json({ ok: true });
});

async function getRolePermissions(tenantId: string, roleId: string): Promise<string[]> {
  if (roleId === "admin") return ["*"];
  const result = await query("SELECT permissions FROM roles WHERE tenant_id = $1 AND id = $2", [tenantId, roleId]);
  if (!result.rows[0]) return [];
  const perms = result.rows[0].permissions;
  return typeof perms === "string" ? JSON.parse(perms) : perms;
}

// Tenant access middleware — block app APIs when subscription inactive (billing/payment/support still work)
const ALLOWED_WHEN_INACTIVE = ["/tenant/subscription", "/tenant/payments/", "/tenant/support/"];

function isAllowedWhenInactive(path: string, method: string) {
  if (ALLOWED_WHEN_INACTIVE.some((p) => path.includes(p))) {
    return method === "GET" || path.includes("/tenant/payments/") || path.includes("/tenant/support/");
  }
  return false;
}

async function tenantAccess(req: Request, res: Response, next: () => void) {
  const auth = getAuth(req);
  if (auth.isPlatformAdmin || auth.impersonatedBy) return next();
  if (!auth.tenantId) return res.status(403).json({ error: "No tenant" });
  const access = await data.checkTenantAccess(auth.tenantId);
  if (access.allowed) return next();
  const path = req.path || req.url.split("?")[0];
  if (isAllowedWhenInactive(path, req.method)) return next();
  return res.status(403).json({
    error: access.reason,
    code: access.code,
    subscriptionRequired: true,
  });
}

// ─── Platform Admin ──────────────────────────────────────────────────────────

router.get("/api/platform/stats", requirePlatformAdmin, async (_req, res) => {
  res.json(await data.getPlatformStats());
});

router.get("/api/platform/tenants", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS_VIEW), async (_req, res) => {
  res.json(await data.getAllTenants());
});

router.get("/api/platform/tenants/:id", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS_VIEW), async (req, res) => {
  const tenant = await data.getTenantById(req.params.id);
  if (!tenant) return res.status(404).json({ error: "Not found" });
  res.json(tenant);
});

router.patch("/api/platform/tenants/:id", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EDIT), async (req, res) => {
  await data.updateTenant(req.params.id, req.body);
  res.json({ ok: true });
});

router.post("/api/platform/tenants/:id/impersonate", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS_IMPERSONATE), async (req, res) => {
  try {
    const auth = getAuth(req);
    const payload = await data.impersonateTenant(auth.userId, req.params.id);
    const token = signToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
      isPlatformAdmin: false,
      impersonatedBy: payload.impersonatedBy,
    });
    res.json({ token, tenantId: payload.tenantId });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/api/platform/plans", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.PLANS_VIEW), async (_req, res) => {
  res.json(await data.getSubscriptionPlans());
});

router.post("/api/platform/plans", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.PLANS_EDIT), async (req, res) => {
  try {
    const plan = await data.createSubscriptionPlan(req.body);
    res.status(201).json(plan);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch("/api/platform/plans/:id", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.PLANS_EDIT), async (req, res) => {
  try {
    const plan = await data.updateSubscriptionPlan(req.params.id, req.body);
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/api/platform/plans/:id", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.PLANS_EDIT), async (req, res) => {
  try {
    await data.deleteSubscriptionPlan(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ─── Tenant API ──────────────────────────────────────────────────────────────

router.use("/api", requireStaffAccount as unknown as import("express").RequestHandler);
router.use("/api", tenantAccess as unknown as import("express").RequestHandler);
router.use("/api", requireTenant);

const tid = (req: Request) => getAuth(req).tenantId!;

// Dashboard
router.get("/api/dashboard/stats", async (req, res) => {
  const { start, end } = req.query;
  res.json(await data.getDashboardStats(tid(req), start as string, end as string));
});

// Members
router.get("/api/members", async (req, res) => res.json(await data.getMembers(tid(req))));
router.post("/api/members", upload.fields([{ name: "imageFile", maxCount: 1 }, { name: "documentFiles", maxCount: 10 }]), async (req, res) => {
  const body = req.body;
  const files = req.files as { imageFile?: Express.Multer.File[]; documentFiles?: Express.Multer.File[] };
  if (files?.imageFile?.[0]) body.imageUrl = await saveFile(tid(req), "members/profile", files.imageFile[0]);
  if (files?.documentFiles) {
    body.documents = await Promise.all(files.documentFiles.map(async (f) => ({
      name: f.originalname, label: f.originalname,
      url: await saveFile(tid(req), `members/${Date.now()}/documents`, f),
      type: f.mimetype, size: f.size, uploadedAt: new Date().toISOString(),
    })));
  }
  const member = await data.createMember(tid(req), body);
  res.status(201).json(member);
});
router.patch("/api/members/:id", upload.fields([{ name: "imageFile", maxCount: 1 }, { name: "documentFiles", maxCount: 10 }]), async (req, res) => {
  const body = req.body;
  const files = req.files as { imageFile?: Express.Multer.File[]; documentFiles?: Express.Multer.File[] };
  if (files?.imageFile?.[0]) body.imageUrl = await saveFile(tid(req), "members/profile", files.imageFile[0]);
  await data.updateMember(tid(req), req.params.id, body);
  res.json({ ok: true });
});
router.delete("/api/members/:id", async (req, res) => {
  await data.deleteMember(tid(req), req.params.id);
  res.status(204).send();
});
router.get("/api/members/:id/subscriptions", async (req, res) => {
  res.json(await data.getSubscriptionsByMember(tid(req), req.params.id));
});
router.get("/api/members/:id/sales", async (req, res) => {
  res.json(await data.getSalesByMember(tid(req), req.params.id));
});
router.get("/api/members/:id/attendance", async (req, res) => {
  res.json(await data.getAttendanceByMember(tid(req), [req.params.id]));
});
router.post("/api/members/:id/documents", upload.array("files"), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  const member = await data.getMember(tid(req), req.params.id);
  if (!member) return res.status(404).json({ error: "Not found" });
  const docs = (member as { documents?: unknown[] }).documents || [];
  const newDocs = await Promise.all((files || []).map(async (f) => ({
    name: f.originalname, label: f.originalname,
    url: await saveFile(tid(req), `members/${req.params.id}/documents`, f),
    type: f.mimetype, size: f.size, uploadedAt: new Date().toISOString(),
  })));
  await data.updateMember(tid(req), req.params.id, { documents: [...docs, ...newDocs] });
  res.json(newDocs);
});
router.delete("/api/members/:id/documents/:name", async (req, res) => {
  const member = await data.getMember(tid(req), req.params.id);
  if (!member) return res.status(404).json({ error: "Not found" });
  const docs = ((member as { documents?: { name: string }[] }).documents || []).filter((d) => d.name !== req.params.name);
  await data.updateMember(tid(req), req.params.id, { documents: docs });
  res.json({ ok: true });
});
router.post("/api/members/:id/sync-subscription", async (req, res) => {
  await data.syncMemberSubscriptionStatus(tid(req), req.params.id);
  res.json({ ok: true });
});

// Attendance
router.get("/api/attendance", async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
  res.json(await data.getAttendanceByDate(tid(req), date));
});
router.get("/api/attendance/all", async (req, res) => res.json(await data.getAllAttendance(tid(req))));
router.post("/api/attendance", async (req, res) => {
  res.status(201).json(await data.createAttendance(tid(req), req.body));
});
router.delete("/api/attendance/:id", async (req, res) => {
  await data.deleteAttendance(tid(req), req.params.id);
  res.status(204).send();
});

// Subscriptions
router.get("/api/subscriptions", async (req, res) => res.json(await data.getSubscriptions(tid(req))));
router.post("/api/subscriptions", async (req, res) => {
  const sub = await data.createSubscription(tid(req), req.body);
  if (req.body.paymentStatus === "paid") {
    await data.createSale(tid(req), {
      productId: "subscription", productName: `Subscription: ${req.body.planName}`,
      quantity: 1, unitPrice: req.body.amount, totalPrice: req.body.amount,
      buyerName: req.body.memberName, date: new Date().toISOString(),
      paymentMethod: req.body.paymentMethod || "cash", status: "completed", subscriptionId: sub.id,
    });
  }
  res.status(201).json(sub);
});
router.patch("/api/subscriptions/:id", async (req, res) => {
  await data.updateSubscription(tid(req), req.params.id, req.body);
  res.json({ ok: true });
});
router.delete("/api/subscriptions/:id", async (req, res) => {
  await data.deleteSubscription(tid(req), req.params.id);
  res.status(204).send();
});

// Packages
router.get("/api/packages", async (req, res) => res.json(await data.getPackages(tid(req))));
router.post("/api/packages", async (req, res) => res.status(201).json(await data.createPackage(tid(req), req.body)));
router.patch("/api/packages/:id", async (req, res) => {
  await data.updatePackage(tid(req), req.params.id, req.body);
  res.json({ ok: true });
});
router.delete("/api/packages/:id", async (req, res) => {
  await data.deletePackage(tid(req), req.params.id);
  res.status(204).send();
});

// Belts
router.get("/api/belts", async (req, res) => res.json(await data.getBelts(tid(req))));
router.post("/api/belts", async (req, res) => res.status(201).json(await data.createBelt(tid(req), req.body)));
router.patch("/api/belts/:id", async (req, res) => {
  await data.updateBelt(tid(req), req.params.id, req.body);
  res.json({ ok: true });
});
router.delete("/api/belts/:id", async (req, res) => {
  await data.deleteBelt(tid(req), req.params.id);
  res.status(204).send();
});
router.get("/api/member-belts", async (req, res) => {
  res.json(await data.getMemberBelts(tid(req), req.query.memberId as string));
});
router.post("/api/member-belts", async (req, res) => res.status(201).json(await data.awardBeltToMember(tid(req), req.body)));
router.delete("/api/member-belts/:id", async (req, res) => {
  await data.revokeMemberBelt(tid(req), req.params.id);
  res.status(204).send();
});

// Products
router.get("/api/products", async (req, res) => res.json(await data.getProducts(tid(req))));
router.post("/api/products", upload.single("imageFile"), async (req, res) => {
  const body = req.body;
  if (req.file) body.imageUrl = await saveFile(tid(req), "products", req.file);
  res.status(201).json(await data.createProduct(tid(req), body));
});
router.patch("/api/products/:id", upload.single("imageFile"), async (req, res) => {
  const body = req.body;
  if (req.file) body.imageUrl = await saveFile(tid(req), "products", req.file);
  await data.updateProduct(tid(req), req.params.id, body);
  res.json({ ok: true });
});
router.delete("/api/products/:id", async (req, res) => {
  await data.deleteProduct(tid(req), req.params.id);
  res.status(204).send();
});

// Sales
router.get("/api/sales", async (req, res) => res.json(await data.getSales(tid(req))));
router.post("/api/sales", async (req, res) => res.status(201).json(await data.createSale(tid(req), req.body)));
router.patch("/api/sales/:id/cancel", async (req, res) => {
  const result = await data.cancelSale(tid(req), req.params.id, req.body.reason);
  if (!result) return res.status(404).json({ error: "Not found" });
  res.json(result);
});
router.patch("/api/sales/:id", async (req, res) => {
  await data.updateSale(tid(req), req.params.id, req.body);
  res.json({ ok: true });
});
router.delete("/api/sales/:id", async (req, res) => {
  await data.deleteSale(tid(req), req.params.id);
  res.status(204).send();
});
router.post("/api/sales/receipt/:receiptId/pay", async (req, res) => {
  await data.payReceipt(tid(req), req.params.receiptId, req.body.paymentMethod);
  res.json({ ok: true });
});
router.delete("/api/sales/receipt/:receiptId", async (req, res) => {
  await data.deleteReceipt(tid(req), req.params.receiptId);
  res.json({ ok: true });
});

// Expenses
router.get("/api/expenses", async (req, res) => res.json(await data.getExpenses(tid(req))));
router.post("/api/expenses", async (req, res) => res.status(201).json(await data.createExpense(tid(req), req.body)));
router.patch("/api/expenses/:id", async (req, res) => {
  await data.updateExpense(tid(req), req.params.id, req.body);
  res.json({ ok: true });
});
router.delete("/api/expenses/:id", async (req, res) => {
  await data.deleteExpense(tid(req), req.params.id);
  res.status(204).send();
});

// Logs
router.get("/api/logs", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  res.json(await data.getActivityLogs(tid(req), limit));
});

// Users
router.get("/api/users", async (req, res) => res.json(await data.getUsers(tid(req))));
router.post("/api/users/invite", async (req, res) => {
  const { email, password, name, role } = req.body;
  const user = await data.createUser(tid(req), email, password, name, role);
  res.status(201).json(user);
});
router.patch("/api/users/:id/role", async (req, res) => {
  await data.updateUserRole(tid(req), req.params.id, req.body.role);
  res.json({ ok: true });
});
router.delete("/api/users/:id", async (req, res) => {
  await data.deleteUser(tid(req), req.params.id);
  res.status(204).send();
});

// Roles
router.get("/api/roles", async (req, res) => res.json(await data.getRoles(tid(req))));
router.post("/api/roles", async (req, res) => {
  const role = await data.createRole(tid(req), req.body.name, req.body.permissions);
  res.status(201).json(role);
});
router.patch("/api/roles/:id", async (req, res) => {
  await data.updateRole(tid(req), req.params.id, req.body.name, req.body.permissions);
  res.json({ ok: true });
});
router.delete("/api/roles/:id", async (req, res) => {
  await data.deleteRole(tid(req), req.params.id);
  res.status(204).send();
});

// Events
router.get("/api/events", async (req, res) => res.json(await data.getEvents(tid(req))));
router.post("/api/events", async (req, res) => {
  const auth = getAuth(req);
  res.status(201).json(await data.createEvent(tid(req), req.body, auth.userId));
});
router.patch("/api/events/:id", async (req, res) => {
  await data.updateEvent(tid(req), req.params.id, req.body);
  res.json({ ok: true });
});
router.delete("/api/events/:id", async (req, res) => {
  await data.deleteEvent(tid(req), req.params.id);
  res.status(204).send();
});

// Coaches
router.get("/api/coaches", async (req, res) => res.json(await data.getCoaches(tid(req))));
router.post("/api/coaches", async (req, res) => {
  res.status(201).json(await data.createCoach(tid(req), req.body));
});
router.patch("/api/coaches/:id", async (req, res) => {
  const coach = await data.updateCoach(tid(req), req.params.id, req.body);
  if (!coach) return res.status(404).json({ error: "Not found" });
  res.json(coach);
});
router.delete("/api/coaches/:id", async (req, res) => {
  await data.deleteCoach(tid(req), req.params.id);
  res.status(204).send();
});

// Class templates
router.get("/api/classes/templates", async (req, res) => {
  res.json(await data.getClassTemplates(tid(req)));
});
router.post("/api/classes/templates", async (req, res) => {
  res.status(201).json(await data.createClassTemplate(tid(req), req.body));
});
router.patch("/api/classes/templates/:id", async (req, res) => {
  const template = await data.updateClassTemplate(tid(req), req.params.id, req.body);
  if (!template) return res.status(404).json({ error: "Not found" });
  res.json(template);
});
router.delete("/api/classes/templates/:id", async (req, res) => {
  await data.deleteClassTemplate(tid(req), req.params.id);
  res.status(204).send();
});

// Class sessions
router.get("/api/classes/sessions", async (req, res) => {
  const from = (req.query.from as string) || new Date().toISOString();
  const to = (req.query.to as string) || new Date(Date.now() + 7 * 86400000).toISOString();
  res.json(await data.getClassSessions(tid(req), from, to));
});
router.post("/api/classes/sessions", async (req, res) => {
  res.status(201).json(await data.createClassSession(tid(req), req.body));
});
router.patch("/api/classes/sessions/:id", async (req, res) => {
  const session = await data.updateClassSession(tid(req), req.params.id, req.body);
  if (!session) return res.status(404).json({ error: "Not found" });
  res.json(session);
});
router.delete("/api/classes/sessions/:id", async (req, res) => {
  await data.deleteClassSession(tid(req), req.params.id);
  res.status(204).send();
});
router.post("/api/classes/sessions/generate", async (req, res) => {
  const days = Number(req.body.days) || 28;
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + days);
  const created = await data.generateClassSessionsForTenant(tid(req), from, to);
  res.json({ created });
});

// Bookings
router.get("/api/bookings", async (req, res) => {
  const filters: { sessionId?: string; memberId?: string; from?: string; to?: string } = {};
  if (req.query.sessionId) filters.sessionId = req.query.sessionId as string;
  if (req.query.memberId) filters.memberId = req.query.memberId as string;
  if (req.query.from) filters.from = req.query.from as string;
  if (req.query.to) filters.to = req.query.to as string;
  res.json(await bookings.getBookings(tid(req), filters));
});
router.post("/api/bookings", async (req, res) => {
  try {
    const member = await data.getMember(tid(req), req.body.memberId);
    if (!member) return res.status(404).json({ error: "Member not found" });
    const booking = await bookings.createBooking({
      tenantId: tid(req),
      sessionId: req.body.sessionId,
      memberId: req.body.memberId,
      memberName: (member as { name: string }).name,
      bookedBy: "staff",
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});
router.delete("/api/bookings/:id", async (req, res) => {
  try {
    await bookings.cancelBooking(tid(req), req.params.id, { force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/api/booking-settings", async (req, res) => {
  res.json(await bookings.getBookingSettings(tid(req)));
});
router.patch("/api/booking-settings", async (req, res) => {
  res.json(await bookings.updateBookingSettings(tid(req), req.body));
});

router.post("/api/members/:id/portal-access", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }
    const account = await data.enableMemberPortalAccess(tid(req), req.params.id, password);
    res.status(201).json(account);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});
router.get("/api/members/:id/portal-access", async (req, res) => {
  const account = await data.getMemberAccount(tid(req), req.params.id);
  res.json(account || { enabled: false });
});

// Settings
router.get("/api/settings", async (req, res) => {
  const settings = await data.getSettings(tid(req));
  res.json(settings || {});
});
router.patch("/api/settings", async (req, res) => {
  await data.updateSettings(tid(req), req.body);
  res.json({ ok: true });
});
router.post("/api/settings/apply-club-type", async (req, res) => {
  const { clubType } = req.body;
  if (!clubType) return res.status(400).json({ error: "clubType required" });
  await data.applyClubTypeTemplate(tid(req), clubType);
  res.json({ ok: true });
});
router.post("/api/settings/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const { category } = req.body;
  const url = await saveFile(tid(req), `club/${category || "misc"}`, req.file);
  res.json({ url });
});

// Tenant subscription info
router.get("/api/tenant/subscription", async (req, res) => {
  res.json(await data.getTenantSubscription(tid(req)));
});

router.get("/api/tenant/payments/config", async (req, res) => {
  const auth = getAuth(req);
  let trialDaysRemaining: number | null = null;
  if (auth.tenantId) {
    const tenant = await query("SELECT status, trial_ends_at FROM tenants WHERE id = $1", [auth.tenantId]);
    if (tenant.rows[0]?.status === "trial") {
      trialDaysRemaining = data.getTrialDaysRemaining(tenant.rows[0].trial_ends_at as string);
    }
  }
  res.json({
    tapEnabled: isTapConfigured(),
    currency: process.env.TAP_CURRENCY || "USD",
    trialDaysRemaining,
  });
});

router.post("/api/tenant/payments/checkout", async (req, res) => {
  try {
    const auth = getAuth(req);
    const billingCycle = req.body.billingCycle === "yearly" ? "yearly" : "monthly";
    const checkout = await data.createPlatformCheckout(auth.tenantId!, auth.userId, billingCycle);
    res.json(checkout);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/api/tenant/payments/confirm", async (req, res) => {
  try {
    const tapId = req.query.tap_id as string;
    if (!tapId) return res.status(400).json({ error: "Missing tap_id" });
    const result = await data.confirmPlatformPayment(tapId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/api/tenant/support/conversation", async (req, res) => {
  const auth = getAuth(req);
  const user = await query("SELECT display_name FROM users WHERE id = $1", [auth.userId]);
  const conv = await data.getOrCreateSupportConversation(
    tid(req),
    auth.userId,
    (user.rows[0]?.display_name as string) || auth.email,
  );
  res.json(conv);
});

router.get("/api/tenant/support/messages", async (req, res) => {
  const conversationId = req.query.conversationId as string;
  if (!conversationId) return res.status(400).json({ error: "conversationId required" });
  res.json(await data.getSupportMessages(conversationId, tid(req)));
});

router.post("/api/tenant/support/messages", async (req, res) => {
  const auth = getAuth(req);
  const { conversationId, body } = req.body;
  if (!conversationId || !body) return res.status(400).json({ error: "conversationId and body required" });
  const user = await query("SELECT display_name FROM users WHERE id = $1", [auth.userId]);
  const msg = await data.sendSupportMessage({
    conversationId,
    body,
    senderType: "tenant_user",
    senderId: auth.userId,
    senderName: (user.rows[0]?.display_name as string) || auth.email,
    tenantId: tid(req),
  });
  res.status(201).json(msg);
});

router.get("/api/platform/payments", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.PAYMENTS_VIEW), async (_req, res) => {
  res.json(await data.getPlatformPayments());
});

router.get("/api/platform/support/conversations", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_VIEW), async (_req, res) => {
  res.json(await data.getAllSupportConversations());
});

router.get("/api/platform/support/conversations/:id/messages", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_VIEW), async (req, res) => {
  res.json(await data.getSupportMessages(req.params.id));
});

router.post("/api/platform/support/conversations/:id/messages", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_REPLY), async (req, res) => {
  const auth = getAuth(req);
  const admin = await data.getPlatformAdminById(auth.userId);
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: "body required" });
  const msg = await data.sendSupportMessage({
    conversationId: req.params.id,
    body,
    senderType: "platform_admin",
    senderId: auth.userId,
    senderName: (admin?.displayName as string) || auth.email,
  });
  res.status(201).json(msg);
});

router.get("/api/platform/admins", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.ADMINS_VIEW), async (_req, res) => {
  res.json(await data.getAllPlatformAdmins());
});

router.get("/api/platform/admin-roles", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.ADMINS_VIEW), async (_req, res) => {
  res.json(await data.getPlatformAdminRoles());
});

router.post("/api/platform/admins", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.ADMINS_EDIT), async (req, res) => {
  try {
    const admin = await data.createPlatformAdminUser(req.body);
    res.status(201).json(admin);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch("/api/platform/admins/:id", requirePlatformAdmin, requirePlatformPermission(PLATFORM_PERMISSIONS.ADMINS_EDIT), async (req, res) => {
  try {
    await data.updatePlatformAdminUser(req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Backup
router.get("/api/backup/export", async (req, res) => {
  const t = tid(req);
  const [members, products, attendance, subscriptions, packages, belts, memberBelts, sales, expenses, logs, events, settings, users, roles] = await Promise.all([
    data.getMembers(t), data.getProducts(t), data.getAllAttendance(t), data.getSubscriptions(t),
    data.getPackages(t), data.getBelts(t), data.getMemberBelts(t), data.getSales(t),
    data.getExpenses(t), data.getActivityLogs(t, 10000), data.getEvents(t),
    data.getSettings(t), data.getUsers(t), data.getRoles(t),
  ]);
  res.json({ exportedAt: new Date().toISOString(), data: { members, products, attendance, subscriptions, packages, belts, memberBelts, sales, expenses, activityLogs: logs, events, settings, users, roles } });
});

router.post("/api/backup/import", async (req, res) => {
  const t = tid(req);
  const { data: collections } = req.body;
  if (!collections) return res.status(400).json({ error: "Invalid backup format" });
  // Import is best-effort; clear first then re-import core collections
  for (const member of collections.members || []) {
    const { id, ...rest } = member;
    try { await data.createMember(t, rest); } catch { /* skip duplicates */ }
  }
  res.json({ ok: true, message: "Partial import completed. Full restore may require manual review." });
});

router.post("/api/backup/clear", async (req, res) => {
  const t = tid(req);
  const tables = ["activity_logs", "events", "sales", "expenses", "attendance", "member_belts", "subscriptions", "members", "products", "packages", "belts"];
  for (const table of tables) {
    await query(`DELETE FROM ${table} WHERE tenant_id = $1`, [t]);
  }
  res.json({ ok: true });
});
