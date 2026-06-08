import { query } from "./db/index.js";
import { formatTimestamp, toCamelCase } from "./utils.js";

export type BookingSettings = {
  tenantId: string;
  bookingWindowDays: number;
  cancellationHours: number;
  allowWaitlist: boolean;
  autoPromoteWaitlist: boolean;
  portalEnabled: boolean;
  tapEnabled: boolean;
  widgetEnabled: boolean;
  publicSlug: string | null;
};

const DEFAULT_SETTINGS: Omit<BookingSettings, "tenantId" | "publicSlug"> = {
  bookingWindowDays: 7,
  cancellationHours: 2,
  allowWaitlist: true,
  autoPromoteWaitlist: true,
  portalEnabled: true,
  tapEnabled: true,
  widgetEnabled: true,
};

export async function getBookingSettings(tenantId: string): Promise<BookingSettings> {
  const result = await query(
    "SELECT * FROM tenant_booking_settings WHERE tenant_id = $1",
    [tenantId],
  );
  if (!result.rows[0]) {
    const tenant = await query("SELECT slug FROM tenants WHERE id = $1", [tenantId]);
    const slug = (tenant.rows[0]?.slug as string) || null;
    await query(
      `INSERT INTO tenant_booking_settings (tenant_id, public_slug) VALUES ($1, $2)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId, slug],
    );
    return { tenantId, publicSlug: slug, ...DEFAULT_SETTINGS };
  }
  const row = toCamelCase(result.rows[0]) as BookingSettings;
  return row;
}

export async function getTenantByPortalSlug(slug: string) {
  const result = await query(
    `SELECT t.id, t.name, t.slug, t.status, bs.portal_enabled
     FROM tenants t
     LEFT JOIN tenant_booking_settings bs ON bs.tenant_id = t.id
     WHERE t.slug = $1 OR bs.public_slug = $1
     LIMIT 1`,
    [slug],
  );
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}

export async function updateBookingSettings(tenantId: string, updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    bookingWindowDays: "booking_window_days",
    cancellationHours: "cancellation_hours",
    allowWaitlist: "allow_waitlist",
    autoPromoteWaitlist: "auto_promote_waitlist",
    portalEnabled: "portal_enabled",
    tapEnabled: "tap_enabled",
    widgetEnabled: "widget_enabled",
    publicSlug: "public_slug",
  };
  await getBookingSettings(tenantId);
  const fields: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [tenantId];
  let idx = 2;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      fields.push(`${col} = $${idx++}`);
      values.push(updates[key]);
    }
  }
  await query(
    `UPDATE tenant_booking_settings SET ${fields.join(", ")} WHERE tenant_id = $1`,
    values,
  );
  return getBookingSettings(tenantId);
}

export async function memberHasActiveSubscription(tenantId: string, memberId: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const result = await query(
    `SELECT id FROM subscriptions
     WHERE tenant_id = $1 AND member_id = $2 AND status NOT IN ('cancelled', 'expired')
       AND start_date <= $3 AND end_date >= $3
       AND (package_type != 'sessions' OR sessions_remaining > 0)
     LIMIT 1`,
    [tenantId, memberId, today],
  );
  return result.rows.length > 0;
}

export async function validateBooking(
  tenantId: string,
  memberId: string,
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const settings = await getBookingSettings(tenantId);
  if (!settings.portalEnabled) {
    // staff can still book when portal disabled
  }

  const sessionResult = await query(
    `SELECT * FROM class_sessions WHERE tenant_id = $1 AND id = $2`,
    [tenantId, sessionId],
  );
  const session = sessionResult.rows[0];
  if (!session) return { ok: false, error: "Session not found" };
  if (session.status !== "scheduled") return { ok: false, error: "Session is not available" };

  const startsAt = new Date(session.starts_at as string);
  const now = new Date();
  if (startsAt < now) return { ok: false, error: "Session has already started" };

  const maxBookDate = new Date();
  maxBookDate.setDate(maxBookDate.getDate() + settings.bookingWindowDays);
  if (startsAt > maxBookDate) {
    return { ok: false, error: `Booking window is ${settings.bookingWindowDays} days` };
  }

  const existing = await query(
    `SELECT id, status FROM bookings WHERE session_id = $1 AND member_id = $2`,
    [sessionId, memberId],
  );
  if (existing.rows[0]) {
    const status = existing.rows[0].status as string;
    if (status === "confirmed" || status === "waitlist") {
      return { ok: false, error: "Already booked for this session" };
    }
  }

  const active = await memberHasActiveSubscription(tenantId, memberId);
  if (!active) return { ok: false, error: "No active subscription" };

  const confirmedCount = await query(
    `SELECT COUNT(*)::int AS count FROM bookings
     WHERE session_id = $1 AND status = 'confirmed'`,
    [sessionId],
  );
  const count = confirmedCount.rows[0]?.count as number;
  const capacity = session.capacity as number;

  if (count >= capacity) {
    if (!settings.allowWaitlist) return { ok: false, error: "Session is full" };
  }

  return { ok: true };
}

async function syncSessionBookedCount(sessionId: string) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM bookings WHERE session_id = $1 AND status = 'confirmed'`,
    [sessionId],
  );
  const count = result.rows[0]?.count as number;
  await query("UPDATE class_sessions SET booked_count = $2 WHERE id = $1", [sessionId, count]);
}

async function promoteWaitlist(sessionId: string) {
  const session = await query("SELECT capacity FROM class_sessions WHERE id = $1", [sessionId]);
  if (!session.rows[0]) return;

  const confirmed = await query(
    `SELECT COUNT(*)::int AS count FROM bookings WHERE session_id = $1 AND status = 'confirmed'`,
    [sessionId],
  );
  const capacity = session.rows[0].capacity as number;
  let slots = capacity - (confirmed.rows[0]?.count as number);
  if (slots <= 0) return;

  const waitlist = await query(
    `SELECT id FROM bookings WHERE session_id = $1 AND status = 'waitlist'
     ORDER BY booked_at ASC`,
    [sessionId],
  );
  for (const row of waitlist.rows) {
    if (slots <= 0) break;
    await query("UPDATE bookings SET status = 'confirmed' WHERE id = $1", [row.id]);
    slots--;
  }
  await syncSessionBookedCount(sessionId);
}

export async function createBooking(params: {
  tenantId: string;
  sessionId: string;
  memberId: string;
  memberName: string;
  bookedBy: "member" | "staff";
}) {
  const validation = await validateBooking(params.tenantId, params.memberId, params.sessionId);
  if (!validation.ok) throw new Error(validation.error);

  const settings = await getBookingSettings(params.tenantId);
  const session = await query(
    "SELECT capacity FROM class_sessions WHERE id = $1",
    [params.sessionId],
  );
  const capacity = session.rows[0]?.capacity as number;

  const confirmedCount = await query(
    `SELECT COUNT(*)::int AS count FROM bookings WHERE session_id = $1 AND status = 'confirmed'`,
    [params.sessionId],
  );
  const full = (confirmedCount.rows[0]?.count as number) >= capacity;
  const status = full && settings.allowWaitlist ? "waitlist" : "confirmed";

  const existing = await query(
    "SELECT id FROM bookings WHERE session_id = $1 AND member_id = $2",
    [params.sessionId, params.memberId],
  );

  let booking;
  if (existing.rows[0]) {
    const result = await query(
      `UPDATE bookings SET status = $3, booked_at = NOW(), cancelled_at = NULL, booked_by = $4, member_name = $5
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [existing.rows[0].id, params.tenantId, status, params.bookedBy, params.memberName],
    );
    booking = result.rows[0];
  } else {
    const result = await query(
      `INSERT INTO bookings (tenant_id, session_id, member_id, member_name, status, booked_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [params.tenantId, params.sessionId, params.memberId, params.memberName, status, params.bookedBy],
    );
    booking = result.rows[0];
  }

  await syncSessionBookedCount(params.sessionId);
  const mapped = mapBooking(booking);

  try {
    const { enqueueNotification } = await import("./notifications.js");
    const sessionRow = await query(
      `SELECT s.name, s.starts_at, m.email FROM class_sessions s
       JOIN members m ON m.id = $2 WHERE s.id = $1`,
      [params.sessionId, params.memberId],
    );
    const row = sessionRow.rows[0];
    if (row?.email) {
      const startsAt = new Date(row.starts_at as string);
      await enqueueNotification({
        tenantId: params.tenantId,
        memberId: params.memberId,
        eventKey: "booking_confirmed",
        recipient: row.email as string,
        vars: {
          name: params.memberName,
          className: row.name as string,
          classTime: startsAt.toLocaleString(),
        },
      });
    }
  } catch (err) {
    console.error("[notify] booking_confirmed:", err);
  }

  return mapped;
}

export async function cancelBooking(
  tenantId: string,
  bookingId: string,
  options?: { force?: boolean },
) {
  const settings = await getBookingSettings(tenantId);
  const bookingResult = await query(
    `SELECT b.*, s.starts_at FROM bookings b
     JOIN class_sessions s ON s.id = b.session_id
     WHERE b.tenant_id = $1 AND b.id = $2`,
    [tenantId, bookingId],
  );
  const booking = bookingResult.rows[0];
  if (!booking) throw new Error("Booking not found");
  if (booking.status === "cancelled") throw new Error("Already cancelled");

  if (!options?.force) {
    const startsAt = new Date(booking.starts_at as string);
    const hoursUntil = (startsAt.getTime() - Date.now()) / 3_600_000;
    if (hoursUntil < settings.cancellationHours) {
      throw new Error(`Cancellation must be at least ${settings.cancellationHours} hours before class`);
    }
  }

  await query(
    `UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
    [bookingId],
  );
  await syncSessionBookedCount(booking.session_id as string);
  if (settings.autoPromoteWaitlist) {
    await promoteWaitlist(booking.session_id as string);
  }

  try {
    const { enqueueNotification } = await import("./notifications.js");
    const memberRow = await query("SELECT email FROM members WHERE id = $1", [booking.member_id]);
    if (memberRow.rows[0]?.email) {
      const startsAt = new Date(booking.starts_at as string);
      await enqueueNotification({
        tenantId,
        memberId: booking.member_id as string,
        eventKey: "booking_cancelled",
        recipient: memberRow.rows[0].email as string,
        vars: {
          name: booking.member_name as string,
          className: (await query("SELECT name FROM class_sessions WHERE id = $1", [booking.session_id])).rows[0]?.name as string || "Class",
          classTime: startsAt.toLocaleString(),
        },
      });
    }
  } catch (err) {
    console.error("[notify] booking_cancelled:", err);
  }
}

export async function markBookingAttended(tenantId: string, memberId: string, date: string) {
  const result = await query(
    `UPDATE bookings b SET status = 'attended', attended_at = NOW()
     FROM class_sessions s
     WHERE b.session_id = s.id AND b.tenant_id = $1 AND b.member_id = $2
       AND b.status = 'confirmed' AND s.starts_at::date = $3::date
     RETURNING b.id`,
    [tenantId, memberId, date],
  );
  return result.rows.length;
}

function mapBooking(row: Record<string, unknown>) {
  const b = toCamelCase(row) as Record<string, unknown>;
  b.bookedAt = formatTimestamp(b.bookedAt);
  if (b.cancelledAt) b.cancelledAt = formatTimestamp(b.cancelledAt);
  if (b.attendedAt) b.attendedAt = formatTimestamp(b.attendedAt);
  if (row.session_name) b.sessionName = row.session_name;
  if (row.starts_at) b.startsAt = formatTimestamp(row.starts_at);
  if (row.ends_at) b.endsAt = formatTimestamp(row.ends_at);
  if (row.coach_name) b.coachName = row.coach_name;
  if (row.location) b.location = row.location;
  return b;
}

export async function getBookings(tenantId: string, filters: { sessionId?: string; memberId?: string; from?: string; to?: string }) {
  const clauses = ["b.tenant_id = $1"];
  const values: unknown[] = [tenantId];
  let idx = 2;

  if (filters.sessionId) {
    clauses.push(`b.session_id = $${idx++}`);
    values.push(filters.sessionId);
  }
  if (filters.memberId) {
    clauses.push(`b.member_id = $${idx++}`);
    values.push(filters.memberId);
  }
  if (filters.from) {
    clauses.push(`s.starts_at >= $${idx++}`);
    values.push(filters.from);
  }
  if (filters.to) {
    clauses.push(`s.starts_at <= $${idx++}`);
    values.push(filters.to);
  }

  const result = await query(
    `SELECT b.*, s.name AS session_name, s.starts_at, s.ends_at, s.location, c.name AS coach_name
     FROM bookings b
     JOIN class_sessions s ON s.id = b.session_id
     LEFT JOIN coaches c ON c.id = s.coach_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY s.starts_at DESC`,
    values,
  );
  return result.rows.map(mapBooking);
}
