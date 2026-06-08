import { query } from "./db/index.js";
import { formatTimestamp, rowsToCamel, toCamelCase } from "./utils.js";

function mapEvent(row: Record<string, unknown>) {
  const e = toCamelCase(row) as Record<string, unknown>;
  e.startDate = formatTimestamp(e.startDate);
  if (e.endDate) e.endDate = formatTimestamp(e.endDate);
  return e;
}

export async function getCamps(tenantId: string, publicOnly = false) {
  const clause = publicOnly ? " AND is_public = true" : "";
  const result = await query(
    `SELECT * FROM events WHERE tenant_id = $1 AND event_type IN ('camp','tournament','workshop')${clause}
     ORDER BY start_date DESC`,
    [tenantId],
  );
  return result.rows.map(mapEvent);
}

export async function createCamp(tenantId: string, userId: string | null, data: Record<string, unknown>) {
  const result = await query(
    `INSERT INTO events (tenant_id, title, description, start_date, end_date, is_all_day, color,
      event_type, capacity, price, branch_id, is_public, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      tenantId, data.title, data.description || null, data.startDate, data.endDate || null,
      data.isAllDay ?? false, data.color || "#8b5cf6", data.eventType || "camp",
      data.capacity || null, data.price || null, data.branchId || null, data.isPublic ?? false, userId,
    ],
  );
  return mapEvent(result.rows[0]);
}

export async function updateCamp(tenantId: string, id: string, updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    title: "title", description: "description", startDate: "start_date", endDate: "end_date",
    isAllDay: "is_all_day", color: "color", eventType: "event_type", capacity: "capacity",
    price: "price", branchId: "branch_id", isPublic: "is_public",
  };
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${idx++}`); values.push(updates[key]); }
  }
  if (!fields.length) return null;
  const result = await query(
    `UPDATE events SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    values,
  );
  return result.rows[0] ? mapEvent(result.rows[0]) : null;
}

export async function registerForCamp(tenantId: string, eventId: string, data: { memberId?: string; memberName: string; phone?: string }) {
  const event = await query(
    "SELECT * FROM events WHERE tenant_id = $1 AND id = $2 AND event_type IN ('camp','tournament','workshop')",
    [tenantId, eventId],
  );
  if (!event.rows[0]) throw new Error("Event not found");

  const count = await query(
    "SELECT COUNT(*)::int AS c FROM event_registrations WHERE event_id = $1 AND status = 'registered'",
    [eventId],
  );
  const capacity = event.rows[0].capacity as number | null;
  if (capacity && (count.rows[0]?.c as number) >= capacity) throw new Error("Event is full");

  const result = await query(
    `INSERT INTO event_registrations (tenant_id, event_id, member_id, member_name, phone)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (event_id, member_id) DO UPDATE SET status = 'registered', registered_at = NOW()
     RETURNING *`,
    [tenantId, eventId, data.memberId || null, data.memberName, data.phone || null],
  );
  return toCamelCase(result.rows[0]);
}

export async function getCampRegistrations(tenantId: string, eventId: string) {
  const result = await query(
    "SELECT * FROM event_registrations WHERE tenant_id = $1 AND event_id = $2 ORDER BY registered_at",
    [tenantId, eventId],
  );
  return rowsToCamel(result.rows);
}
