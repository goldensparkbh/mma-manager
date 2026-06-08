import crypto from "crypto";
import { query } from "./db/index.js";
import { sendEmail } from "./email.js";

const OTP_TTL_MS = 10 * 60 * 1000;

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "");
}

function generateCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

export async function requestPortalOtp(slug: string, phone: string) {
  const { getTenantByPortalSlug, getBookingSettings } = await import("./bookings.js");
  const tenant = await getTenantByPortalSlug(slug);
  if (!tenant) throw new Error("Club not found");
  const tenantId = tenant.id as string;
  const settings = await getBookingSettings(tenantId);
  if (!settings.portalEnabled) throw new Error("Member portal is disabled");

  const normalized = normalizePhone(phone);
  const account = await query(
    `SELECT ma.id, ma.email, m.name AS member_name
     FROM member_accounts ma
     JOIN members m ON m.id = ma.member_id
     WHERE ma.tenant_id = $1 AND ma.is_active = true
       AND REPLACE(ma.phone, ' ', '') = $2`,
    [tenantId, normalized],
  );
  if (!account.rows[0]) throw new Error("No portal account found for this phone number");

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await query("DELETE FROM portal_otp_codes WHERE tenant_id = $1 AND phone = $2", [tenantId, normalized]);
  await query(
    `INSERT INTO portal_otp_codes (tenant_id, phone, code, expires_at) VALUES ($1,$2,$3,$4)`,
    [tenantId, normalized, code, expiresAt.toISOString()],
  );

  const row = account.rows[0];
  const clubName = tenant.name as string;
  let sentVia: "email" | "console" | "sms" = "console";

  if (row.email) {
    const ok = await sendEmail({
      to: row.email as string,
      subject: `${clubName} — login code`,
      html: `<p>Your login code is: <strong>${code}</strong></p><p>Valid for 10 minutes.</p>`,
      text: `Your login code is ${code}. Valid for 10 minutes.`,
    });
    if (ok) sentVia = "email";
  }

  const { sendSms, isSmsConfigured } = await import("./sms.js");
  if (isSmsConfigured()) {
    const smsOk = await sendSms(normalized, `Your ${clubName} login code: ${code}. Valid 10 minutes.`);
    if (smsOk) sentVia = "sms";
  }

  console.log(`[portal-otp] ${clubName} → ${normalized}: ${code}`);
  return { ok: true, sentVia, maskedPhone: normalized.slice(-4) };
}

export async function verifyPortalOtp(slug: string, phone: string, code: string) {
  const { getTenantByPortalSlug } = await import("./bookings.js");
  const tenant = await getTenantByPortalSlug(slug);
  if (!tenant) throw new Error("Club not found");
  const tenantId = tenant.id as string;
  const normalized = normalizePhone(phone);

  const otpRow = await query(
    `SELECT * FROM portal_otp_codes
     WHERE tenant_id = $1 AND phone = $2 AND code = $3 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, normalized, code.trim()],
  );
  if (!otpRow.rows[0]) throw new Error("Invalid or expired code");

  await query("UPDATE portal_otp_codes SET used_at = NOW() WHERE id = $1", [otpRow.rows[0].id]);

  const account = await query(
    `SELECT ma.*, m.name AS member_name
     FROM member_accounts ma
     JOIN members m ON m.id = ma.member_id
     WHERE ma.tenant_id = $1 AND ma.is_active = true
       AND REPLACE(ma.phone, ' ', '') = $2`,
    [tenantId, normalized],
  );
  const row = account.rows[0];
  if (!row) throw new Error("Account not found");

  await query("UPDATE member_accounts SET last_login = NOW() WHERE id = $1", [row.id]);

  return {
    accountId: row.id as string,
    tenantId,
    memberId: row.member_id as string,
    memberName: row.member_name as string,
    phone: row.phone as string,
    tenantName: tenant.name as string,
    tenantSlug: tenant.slug as string,
  };
}
