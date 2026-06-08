import crypto from "crypto";
import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase } from "./utils.js";

export type WebhookEvent =
  | "booking.created"
  | "booking.cancelled"
  | "payment.received"
  | "payment.failed"
  | "member.created"
  | "attendance.checkin";

export async function getWebhooks(tenantId: string) {
  const result = await query(
    "SELECT id, tenant_id, url, events, is_active, created_at FROM tenant_webhooks WHERE tenant_id = $1 ORDER BY created_at",
    [tenantId],
  );
  return rowsToCamel(result.rows);
}

export async function createWebhook(tenantId: string, data: { url: string; events?: string[]; secret?: string }) {
  const secret = data.secret || crypto.randomBytes(16).toString("hex");
  const result = await query(
    `INSERT INTO tenant_webhooks (tenant_id, url, secret, events, is_active)
     VALUES ($1,$2,$3,$4,true) RETURNING id, tenant_id, url, events, is_active, created_at`,
    [tenantId, data.url, secret, JSON.stringify(data.events || ["booking.created", "payment.received"])],
  );
  const row = toCamelCase(result.rows[0]) as Record<string, unknown>;
  row.secret = secret;
  return row;
}

export async function updateWebhook(tenantId: string, id: string, updates: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [tenantId, id];
  let idx = 3;
  if ("url" in updates) { fields.push(`url = $${idx++}`); values.push(updates.url); }
  if ("events" in updates) { fields.push(`events = $${idx++}`); values.push(JSON.stringify(updates.events)); }
  if ("isActive" in updates) { fields.push(`is_active = $${idx++}`); values.push(updates.isActive); }
  if (!fields.length) return null;
  const result = await query(
    `UPDATE tenant_webhooks SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2
     RETURNING id, tenant_id, url, events, is_active, created_at`,
    values,
  );
  return result.rows[0] ? toCamelCase(result.rows[0]) : null;
}

export async function deleteWebhook(tenantId: string, id: string) {
  await query("DELETE FROM tenant_webhooks WHERE tenant_id = $1 AND id = $2", [tenantId, id]);
}

export async function dispatchWebhooks(tenantId: string, event: WebhookEvent, payload: Record<string, unknown>) {
  const hooks = await query(
    `SELECT * FROM tenant_webhooks WHERE tenant_id = $1 AND is_active = true`,
    [tenantId],
  );

  for (const hook of hooks.rows) {
    const events = typeof hook.events === "string" ? JSON.parse(hook.events) : hook.events;
    if (!Array.isArray(events) || !events.includes(event)) continue;

    const body = JSON.stringify({ event, tenantId, timestamp: new Date().toISOString(), data: payload });
    const signature = crypto.createHmac("sha256", hook.secret as string).update(body).digest("hex");

    try {
      await fetch(hook.url as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Dojo-Signature": signature,
          "X-Dojo-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      console.error(`[webhook] ${hook.url}:`, err);
    }
  }
}
