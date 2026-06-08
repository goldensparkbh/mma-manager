import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase } from "./utils.js";
import { sendEmail } from "./email.js";

export type NotificationEvent =
  | "booking_confirmed"
  | "booking_cancelled"
  | "class_reminder"
  | "subscription_expiring"
  | "payment_received";

const DEFAULT_TEMPLATES: Record<NotificationEvent, { subject: string; body: string }> = {
  booking_confirmed: {
    subject: "Class booking confirmed — {className}",
    body: "Hi {name},\n\nYour booking for {className} on {classTime} is confirmed.\n\nSee you at the club!",
  },
  booking_cancelled: {
    subject: "Booking cancelled — {className}",
    body: "Hi {name},\n\nYour booking for {className} on {classTime} has been cancelled.",
  },
  class_reminder: {
    subject: "Reminder: {className} starts soon",
    body: "Hi {name},\n\nReminder: {className} starts at {classTime}. Don't forget to check in!",
  },
  subscription_expiring: {
    subject: "Your membership expires on {endDate}",
    body: "Hi {name},\n\nYour {planName} membership expires on {endDate}. Renew here: {portalUrl}",
  },
  payment_received: {
    subject: "Payment received — {planName}",
    body: "Hi {name},\n\nWe received your payment of {amount} {currency} for {planName}. Thank you!",
  },
};

export async function ensureNotificationTemplates(tenantId: string) {
  for (const [eventKey, tpl] of Object.entries(DEFAULT_TEMPLATES)) {
    await query(
      `INSERT INTO notification_templates (tenant_id, event_key, channel, subject, body, is_enabled)
       VALUES ($1,$2,'email',$3,$4,true)
       ON CONFLICT (tenant_id, event_key, channel) DO NOTHING`,
      [tenantId, eventKey, tpl.subject, tpl.body],
    );
  }
}

export async function getNotificationTemplates(tenantId: string) {
  await ensureNotificationTemplates(tenantId);
  const result = await query(
    "SELECT * FROM notification_templates WHERE tenant_id = $1 ORDER BY event_key",
    [tenantId],
  );
  return rowsToCamel(result.rows);
}

export async function updateNotificationTemplate(
  tenantId: string,
  id: string,
  updates: { subject?: string; body?: string; isEnabled?: boolean },
) {
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  if ("subject" in updates) { fields.push(`subject = $${idx++}`); values.push(updates.subject); }
  if ("body" in updates) { fields.push(`body = $${idx++}`); values.push(updates.body); }
  if ("isEnabled" in updates) { fields.push(`is_enabled = $${idx++}`); values.push(updates.isEnabled); }
  if (!fields.length) return null;
  const result = await query(
    `UPDATE notification_templates SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    values,
  );
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}

function applyVars(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return out;
}

export async function enqueueNotification(params: {
  tenantId: string;
  memberId?: string;
  eventKey: NotificationEvent;
  recipient: string;
  channel?: "email" | "whatsapp" | "sms";
  vars?: Record<string, string>;
}) {
  await ensureNotificationTemplates(params.tenantId);
  const channel = params.channel || "email";
  const tplResult = await query(
    `SELECT * FROM notification_templates WHERE tenant_id = $1 AND event_key = $2 AND channel = $3 AND is_enabled = true`,
    [params.tenantId, params.eventKey, channel],
  );
  const tpl = tplResult.rows[0];
  if (!tpl) return null;

  const vars = params.vars || {};
  const subject = applyVars((tpl.subject as string) || "", vars);
  const body = applyVars(tpl.body as string, vars);

  const result = await query(
    `INSERT INTO notification_queue (tenant_id, member_id, channel, recipient, subject, body)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [params.tenantId, params.memberId || null, channel, params.recipient, subject, body],
  );
  return result.rows[0]?.id;
}

export async function processNotificationQueue(limit = 50): Promise<number> {
  const pending = await query(
    `SELECT * FROM notification_queue
     WHERE status = 'pending' AND scheduled_at <= NOW()
     ORDER BY scheduled_at ASC LIMIT $1`,
    [limit],
  );

  let sent = 0;
  for (const row of pending.rows) {
    try {
      if (row.channel === "email") {
        const ok = await sendEmail({
          to: row.recipient as string,
          subject: (row.subject as string) || "Notification",
          html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${row.body}</pre>`,
          text: row.body as string,
        });
        if (!ok) {
          await query(
            "UPDATE notification_queue SET status = 'failed', error = 'SMTP not configured' WHERE id = $1",
            [row.id],
          );
          continue;
        }
      } else {
        // WhatsApp/SMS: log for manual send until provider integrated
        console.log(`[notify:${row.channel}] → ${row.recipient}: ${row.body}`);
      }
      await query(
        "UPDATE notification_queue SET status = 'sent', sent_at = NOW() WHERE id = $1",
        [row.id],
      );
      sent++;
    } catch (err) {
      await query(
        "UPDATE notification_queue SET status = 'failed', error = $2 WHERE id = $1",
        [row.id, (err as Error).message],
      );
    }
  }
  return sent;
}

export async function processClassReminders(): Promise<number> {
  const now = new Date();
  const in2h = new Date(now.getTime() + 2 * 3_600_000);
  const in2h15 = new Date(now.getTime() + 2.25 * 3_600_000);

  const result = await query(
    `SELECT b.member_id, b.member_name, b.tenant_id, m.email, s.name, s.starts_at
     FROM bookings b
     JOIN class_sessions s ON s.id = b.session_id
     JOIN members m ON m.id = b.member_id
     WHERE b.status = 'confirmed' AND s.status = 'scheduled'
       AND s.starts_at >= $1 AND s.starts_at <= $2
       AND m.email IS NOT NULL AND m.email != ''`,
    [in2h.toISOString(), in2h15.toISOString()],
  );

  let count = 0;
  for (const row of result.rows) {
    await enqueueNotification({
      tenantId: row.tenant_id as string,
      memberId: row.member_id as string,
      eventKey: "class_reminder",
      recipient: row.email as string,
      vars: {
        name: row.member_name as string,
        className: row.name as string,
        classTime: new Date(row.starts_at as string).toLocaleString(),
      },
    });
    count++;
  }
  return count;
}

export async function processSubscriptionExpiryReminders(): Promise<number> {
  const today = new Date();
  const in3days = new Date(today);
  in3days.setDate(in3days.getDate() + 3);
  const targetDate = in3days.toISOString().split("T")[0];

  const result = await query(
    `SELECT s.*, m.name, m.email, m.phone, t.slug, ts.name as club_name
     FROM subscriptions s
     JOIN members m ON m.id = s.member_id
     JOIN tenants t ON t.id = s.tenant_id
     LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
     WHERE s.end_date = $1 AND s.status NOT IN ('cancelled', 'expired')
       AND m.email IS NOT NULL AND m.email != ''`,
    [targetDate],
  );

  let count = 0;
  const baseUrl = process.env.APP_URL || "http://localhost:5173";
  for (const row of result.rows) {
    const slug = row.slug as string;
    await enqueueNotification({
      tenantId: row.tenant_id as string,
      memberId: row.member_id as string,
      eventKey: "subscription_expiring",
      recipient: row.email as string,
      vars: {
        name: row.name as string,
        planName: row.plan_name as string,
        endDate: String(row.end_date).split("T")[0],
        portalUrl: `${baseUrl.replace(/\/$/, "")}/portal/${slug}`,
      },
    });
    count++;
  }
  return count;
}
