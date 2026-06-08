import { query } from "./db/index.js";

export type RecurrenceSlot = { day: number; startTime: string };

function parseRecurrence(raw: unknown): RecurrenceSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (s): s is RecurrenceSlot =>
      typeof s === "object" &&
      s !== null &&
      typeof (s as RecurrenceSlot).day === "number" &&
      typeof (s as RecurrenceSlot).startTime === "string",
  );
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function combineDateAndTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(day);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

export async function generateClassSessionsForTenant(
  tenantId: string,
  fromDate: Date,
  toDate: Date,
): Promise<number> {
  const templates = await query(
    "SELECT * FROM class_templates WHERE tenant_id = $1 AND is_active = true",
    [tenantId],
  );

  let created = 0;
  const cursor = new Date(fromDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const dayOfWeek = cursor.getDay();
    for (const row of templates.rows) {
      const slots = parseRecurrence(row.recurrence);
      for (const slot of slots) {
        if (slot.day !== dayOfWeek) continue;
        const startsAt = combineDateAndTime(cursor, slot.startTime);
        const durationMinutes = (row.duration_minutes as number) || 60;
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

        const existing = await query(
          `SELECT id FROM class_sessions
           WHERE tenant_id = $1 AND template_id = $2 AND starts_at = $3`,
          [tenantId, row.id, startsAt.toISOString()],
        );
        if (existing.rows.length > 0) continue;

        await query(
          `INSERT INTO class_sessions
           (tenant_id, template_id, name, coach_id, location, starts_at, ends_at, capacity, status, branch_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'scheduled',$9)`,
          [
            tenantId,
            row.id,
            row.name,
            row.coach_id || null,
            row.location || null,
            startsAt.toISOString(),
            endsAt.toISOString(),
            row.capacity,
            row.branch_id || null,
          ],
        );
        created++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return created;
}

export async function generateClassSessionsForAllTenants(daysAhead = 28): Promise<number> {
  const tenants = await query(
    "SELECT id FROM tenants WHERE status IN ('active', 'trial')",
  );
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = addDays(from, daysAhead);
  let total = 0;
  for (const row of tenants.rows) {
    total += await generateClassSessionsForTenant(row.id as string, from, to);
  }
  return total;
}

export { dateKey, addDays };
