import { query } from "./db/index.js";
import { toCamelCase } from "./utils.js";
import type { CheckInMethod } from "../shared/attendanceMethods.js";
import crypto from "crypto";

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

export async function toggleMemberCheckIn(
  tenantId: string,
  memberId: string,
  memberName: string,
  method: CheckInMethod,
) {
  const today = new Date().toISOString().split("T")[0];
  const { createAttendance, checkOutAttendance, getLatestAttendanceSession } = await import("./data.js");

  const latest = await getLatestAttendanceSession(tenantId, memberId, today);
  let action: "checkin" | "checkout";
  if (latest && !latest.checkOut) {
    await checkOutAttendance(tenantId, latest.id as string);
    action = "checkout";
  } else {
    await createAttendance(tenantId, {
      memberId,
      memberName,
      date: today,
      checkIn: new Date().toISOString(),
      checkInMethod: method,
    });
    action = "checkin";
  }

  try {
    const { dispatchWebhooks } = await import("./webhooks.js");
    await dispatchWebhooks(tenantId, `attendance.${action}`, {
      memberId,
      memberName,
      date: today,
      method,
    });
  } catch { /* optional */ }

  const memberResult = await query("SELECT * FROM members WHERE tenant_id = $1 AND id = $2", [tenantId, memberId]);
  const member = memberResult.rows[0];

  return {
    ok: true,
    member: member ? toCamelCase(member) : { id: memberId, name: memberName },
    date: today,
    action,
    method,
    alreadyCheckedIn: action === "checkout",
  };
}

export async function qrCheckIn(slug: string, qrToken: string) {
  const { getTenantByPortalSlug } = await import("./bookings.js");
  const { getAttendanceMethods } = await import("./biometrics.js");
  const tenant = await getTenantByPortalSlug(slug);
  if (!tenant) throw new Error("Club not found");
  const tenantId = tenant.id as string;

  const methods = await getAttendanceMethods(tenantId);
  if (!methods.qr) throw new Error("QR check-in is disabled for this club");

  const memberResult = await query(
    "SELECT * FROM members WHERE tenant_id = $1 AND qr_token = $2",
    [tenantId, qrToken],
  );
  const member = memberResult.rows[0];
  if (!member) throw new Error("Invalid QR code");

  return toggleMemberCheckIn(
    tenantId,
    member.id as string,
    member.name as string,
    "qr",
  );
}

export async function biometricCheckIn(
  tenantId: string,
  memberId: string,
  memberName: string,
  method: "fingerprint" | "face",
) {
  const { getAttendanceMethods } = await import("./biometrics.js");
  const methods = await getAttendanceMethods(tenantId);
  if (method === "fingerprint" && !methods.fingerprint) {
    throw new Error("Fingerprint check-in is disabled");
  }
  if (method === "face" && !methods.face) {
    throw new Error("Face recognition check-in is disabled");
  }
  return toggleMemberCheckIn(tenantId, memberId, memberName, method);
}
