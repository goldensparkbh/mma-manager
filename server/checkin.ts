import crypto from "crypto";
import { query } from "./db/index.js";
import { toCamelCase } from "./utils.js";

export async function ensureMemberQrToken(tenantId: string, memberId: string): Promise<string> {
  const existing = await query(
    "SELECT qr_token FROM members WHERE tenant_id = $1 AND id = $2",
    [tenantId, memberId],
  );
  if (existing.rows[0]?.qr_token) return existing.rows[0].qr_token as string;

  const token = crypto.randomBytes(24).toString("hex");
  await query("UPDATE members SET qr_token = $3 WHERE tenant_id = $1 AND id = $2", [tenantId, memberId, token]);
  return token;
}

export async function qrCheckIn(slug: string, qrToken: string) {
  const { getTenantByPortalSlug } = await import("./bookings.js");
  const tenant = await getTenantByPortalSlug(slug);
  if (!tenant) throw new Error("Club not found");
  const tenantId = tenant.id as string;

  const memberResult = await query(
    "SELECT * FROM members WHERE tenant_id = $1 AND qr_token = $2",
    [tenantId, qrToken],
  );
  const member = memberResult.rows[0];
  if (!member) throw new Error("Invalid QR code");

  const today = new Date().toISOString().split("T")[0];
  const existing = await query(
    "SELECT id FROM attendance WHERE tenant_id = $1 AND member_id = $2 AND date = $3",
    [tenantId, member.id, today],
  );

  if (!existing.rows[0]) {
    const { createAttendance } = await import("./data.js");
    await createAttendance(tenantId, {
      memberId: member.id,
      memberName: member.name,
      date: today,
      checkIn: new Date().toISOString(),
    });
  }

  try {
    const { dispatchWebhooks } = await import("./webhooks.js");
    await dispatchWebhooks(tenantId, "attendance.checkin", {
      memberId: member.id,
      memberName: member.name,
      date: today,
    });
  } catch { /* optional */ }

  return {
    ok: true,
    member: toCamelCase(member),
    date: today,
    alreadyCheckedIn: !!existing.rows[0],
  };
}
