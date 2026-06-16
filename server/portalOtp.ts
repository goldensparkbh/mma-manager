import crypto from "crypto";
import { query } from "./db/index.js";
import { sendEmail } from "./email.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RATE_LIMIT = 5;
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000;

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "");
}

function generateCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

async function findMemberAccount(tenantId: string, normalized: string) {
  const account = await query(
    `SELECT ma.id, ma.email, ma.member_id, m.name AS member_name
     FROM member_accounts ma
     JOIN members m ON m.id = ma.member_id
     WHERE ma.tenant_id = $1 AND ma.is_active = true
       AND REPLACE(ma.phone, ' ', '') = $2`,
    [tenantId, normalized],
  );
  return account.rows[0] || null;
}

async function assertOtpRateLimit(tenantId: string, normalized: string) {
  const recent = await query(
    `SELECT COUNT(*)::int AS c FROM portal_otp_codes
     WHERE tenant_id = $1 AND phone = $2 AND created_at > NOW() - INTERVAL '1 hour'`,
    [tenantId, normalized],
  );
  if ((recent.rows[0]?.c as number) >= OTP_RATE_LIMIT) {
    throw new Error("Too many code requests. Try again later.");
  }
}

export async function requestPortalOtp(slug: string, phone: string) {
  const { getTenantByPortalSlug, getBookingSettings } = await import("./bookings.js");
  const tenant = await getTenantByPortalSlug(slug);
  if (!tenant) throw new Error("Club not found");
  const tenantId = tenant.id as string;
  const settings = await getBookingSettings(tenantId);
  if (!settings.portalEnabled) throw new Error("Member portal is disabled");

  const normalized = normalizePhone(phone);
  const account = await findMemberAccount(tenantId, normalized);
  if (!account && !settings.allowSelfRegistration) {
    throw new Error("No portal account found for this phone number");
  }

  await assertOtpRateLimit(tenantId, normalized);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await query("DELETE FROM portal_otp_codes WHERE tenant_id = $1 AND phone = $2", [tenantId, normalized]);
  await query(
    `INSERT INTO portal_otp_codes (tenant_id, phone, code, expires_at) VALUES ($1,$2,$3,$4)`,
    [tenantId, normalized, code, expiresAt.toISOString()],
  );

  const clubName = tenant.name as string;
  let sentVia: "email" | "console" | "sms" = "console";

  if (account?.email) {
    const ok = await sendEmail({
      to: account.email as string,
      subject: `${clubName} — login code`,
      html: `<p>Your login code is: <strong>${code}</strong></p><p>Valid for 10 minutes.</p>`,
      text: `Your login code is ${code}. Valid for 10 minutes.`,
    });
    if (ok) sentVia = "email";
  }

  const { getSmsConfigForSend, formatOtpMessage } = await import("./platformSms.js");
  const { sendSms, isSmsConfigured } = await import("./sms.js");
  const smsConfig = await getSmsConfigForSend();
  const message = formatOtpMessage(smsConfig.otpMessageTemplate, clubName, code);

  if (isSmsConfigured(smsConfig)) {
    const smsOk = await sendSms(normalized, message, smsConfig);
    if (smsOk) sentVia = "sms";
  } else if (smsConfig.provider === "console" || !smsConfig.enabled) {
    console.log(`[portal-otp] ${clubName} → ${normalized}: ${code}`);
  }

  return { ok: true, sentVia, maskedPhone: normalized.slice(-4), isNewUser: !account };
}

export type PortalOtpVerifyResult =
  | {
      kind: "login";
      accountId: string;
      tenantId: string;
      memberId: string;
      memberName: string;
      phone: string;
      tenantName: string;
      tenantSlug: string;
      isNewUser: boolean;
    }
  | { kind: "needs_name" };

export async function verifyPortalOtp(
  slug: string,
  phone: string,
  code: string,
  name?: string,
  branchId?: string | null,
): Promise<PortalOtpVerifyResult> {
  const { getTenantByPortalSlug, getBookingSettings } = await import("./bookings.js");
  const tenant = await getTenantByPortalSlug(slug);
  if (!tenant) throw new Error("Club not found");
  const tenantId = tenant.id as string;
  const settings = await getBookingSettings(tenantId);
  const normalized = normalizePhone(phone);

  const otpRow = await query(
    `SELECT * FROM portal_otp_codes
     WHERE tenant_id = $1 AND phone = $2 AND code = $3 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, normalized, code.trim()],
  );
  if (!otpRow.rows[0]) throw new Error("Invalid or expired code");

  const existing = await findMemberAccount(tenantId, normalized);
  if (existing) {
    await query("UPDATE portal_otp_codes SET used_at = NOW() WHERE id = $1", [otpRow.rows[0].id]);
    await query("UPDATE member_accounts SET last_login = NOW() WHERE id = $1", [existing.id]);
    return {
      kind: "login",
      accountId: existing.id as string,
      tenantId,
      memberId: existing.member_id as string,
      memberName: existing.member_name as string,
      phone: normalized,
      tenantName: tenant.name as string,
      tenantSlug: tenant.slug as string,
      isNewUser: false,
    };
  }

  if (!settings.allowSelfRegistration) {
    throw new Error("No portal account found for this phone number");
  }

  if (!name?.trim()) {
    return { kind: "needs_name" };
  }

  const data = await import("./data.js");
  const registered = await data.registerMemberViaPortal(tenantId, normalized, name.trim(), branchId);

  await query("UPDATE portal_otp_codes SET used_at = NOW() WHERE id = $1", [otpRow.rows[0].id]);
  await query("UPDATE member_accounts SET last_login = NOW() WHERE id = $1", [registered.accountId]);

  return {
    kind: "login",
    accountId: registered.accountId,
    tenantId,
    memberId: registered.memberId,
    memberName: registered.memberName,
    phone: normalized,
    tenantName: tenant.name as string,
    tenantSlug: tenant.slug as string,
    isNewUser: true,
  };
}
