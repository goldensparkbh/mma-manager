import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase } from "./utils.js";
import { sendExpoPush } from "./push.js";

export type PushConfig = {
  enabled: boolean;
  webPopupsEnabled: boolean;
  expoProjectId: string;
  expoAccessToken: string;
};

const CONFIG_KEY = "push_config";

const DEFAULT_CONFIG: PushConfig = {
  enabled: true,
  webPopupsEnabled: true,
  expoProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "",
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN || "",
};

export type BroadcastTarget = "web_staff" | "mobile_member" | "mobile_staff";

export async function getPushConfig(): Promise<PushConfig & { hasAccessToken: boolean }> {
  const row = await query("SELECT value FROM platform_settings WHERE key = $1", [CONFIG_KEY]);
  const stored = (row.rows[0]?.value as Partial<PushConfig>) || {};
  const merged: PushConfig = {
    enabled: stored.enabled ?? DEFAULT_CONFIG.enabled,
    webPopupsEnabled: stored.webPopupsEnabled ?? DEFAULT_CONFIG.webPopupsEnabled,
    expoProjectId: stored.expoProjectId || DEFAULT_CONFIG.expoProjectId,
    expoAccessToken: stored.expoAccessToken || DEFAULT_CONFIG.expoAccessToken,
  };
  return {
    ...merged,
    expoAccessToken: merged.expoAccessToken ? "••••••••" : "",
    hasAccessToken: Boolean(stored.expoAccessToken || process.env.EXPO_ACCESS_TOKEN),
  };
}

export async function getPushConfigForSend(): Promise<PushConfig> {
  const row = await query("SELECT value FROM platform_settings WHERE key = $1", [CONFIG_KEY]);
  const stored = (row.rows[0]?.value as Partial<PushConfig>) || {};
  return {
    enabled: stored.enabled ?? DEFAULT_CONFIG.enabled,
    webPopupsEnabled: stored.webPopupsEnabled ?? DEFAULT_CONFIG.webPopupsEnabled,
    expoProjectId: stored.expoProjectId || DEFAULT_CONFIG.expoProjectId,
    expoAccessToken: stored.expoAccessToken || DEFAULT_CONFIG.expoAccessToken,
  };
}

export async function updatePushConfig(updates: Partial<PushConfig> & { expoAccessToken?: string }) {
  const current = await getPushConfigForSend();
  const next: PushConfig = {
    enabled: updates.enabled ?? current.enabled,
    webPopupsEnabled: updates.webPopupsEnabled ?? current.webPopupsEnabled,
    expoProjectId: updates.expoProjectId ?? current.expoProjectId,
    expoAccessToken:
      updates.expoAccessToken !== undefined && updates.expoAccessToken !== "••••••••"
        ? updates.expoAccessToken
        : current.expoAccessToken,
  };
  await query(
    `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [CONFIG_KEY, JSON.stringify(next)],
  );
  return getPushConfig();
}

export async function getPushStats() {
  const [staffUsers, memberTokens, staffTokens, broadcasts] = await Promise.all([
    query<{ c: number }>("SELECT COUNT(*)::int AS c FROM users"),
    query<{ c: number }>(
      "SELECT COUNT(*)::int AS c FROM push_device_tokens WHERE account_type = 'member' AND is_active = true",
    ),
    query<{ c: number }>(
      "SELECT COUNT(*)::int AS c FROM push_device_tokens WHERE account_type = 'staff' AND is_active = true",
    ),
    query("SELECT COUNT(*)::int AS c FROM platform_broadcasts"),
  ]);
  return {
    webStaffUsers: staffUsers.rows[0]?.c ?? 0,
    mobileMemberDevices: memberTokens.rows[0]?.c ?? 0,
    mobileStaffDevices: staffTokens.rows[0]?.c ?? 0,
    totalBroadcasts: Number((broadcasts.rows[0] as { c: number })?.c ?? 0),
  };
}

export async function listBroadcasts(limit = 25) {
  const result = await query(
    `SELECT b.*, pa.email AS created_by_email
     FROM platform_broadcasts b
     LEFT JOIN platform_admins pa ON pa.id = b.created_by
     ORDER BY b.created_at DESC LIMIT $1`,
    [limit],
  );
  return rowsToCamel(result.rows);
}

export async function sendBroadcast(params: {
  title: string;
  body: string;
  linkUrl?: string;
  targets: BroadcastTarget[];
  createdBy: string;
}) {
  const config = await getPushConfigForSend();
  if (!config.enabled) throw new Error("Push notifications are disabled in platform settings");

  const targets = params.targets.length ? params.targets : (["web_staff"] as BroadcastTarget[]);
  let webStaffCount = 0;
  let mobileMemberSent = 0;
  let mobileStaffSent = 0;

  if (targets.includes("web_staff") && config.webPopupsEnabled) {
    const r = await query<{ c: number }>("SELECT COUNT(*)::int AS c FROM users");
    webStaffCount = r.rows[0]?.c ?? 0;
  }

  const pushOpts = { accessToken: config.expoAccessToken || undefined };

  if (targets.includes("mobile_member")) {
    const r = await query(
      `SELECT expo_push_token FROM push_device_tokens
       WHERE account_type = 'member' AND is_active = true`,
    );
    const tokens = r.rows.map((row) => row.expo_push_token as string);
    mobileMemberSent = await sendExpoPush(
      tokens,
      params.title,
      params.body,
      { linkUrl: params.linkUrl, screen: "notifications" },
      pushOpts,
    );
  }

  if (targets.includes("mobile_staff")) {
    const r = await query(
      `SELECT expo_push_token FROM push_device_tokens
       WHERE account_type = 'staff' AND is_active = true`,
    );
    const tokens = r.rows.map((row) => row.expo_push_token as string);
    mobileStaffSent = await sendExpoPush(
      tokens,
      params.title,
      params.body,
      { linkUrl: params.linkUrl },
      pushOpts,
    );
  }

  const insert = await query(
    `INSERT INTO platform_broadcasts
      (title, body, link_url, targets, web_staff_count, mobile_member_sent, mobile_staff_sent, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      params.title,
      params.body,
      params.linkUrl || null,
      JSON.stringify(targets),
      webStaffCount,
      mobileMemberSent,
      mobileStaffSent,
      params.createdBy,
    ],
  );

  return toCamelCase(insert.rows[0]);
}

export async function getUnreadWebBroadcasts(userId: string) {
  const config = await getPushConfigForSend();
  if (!config.enabled || !config.webPopupsEnabled) return [];

  const result = await query(
    `SELECT b.id, b.title, b.body, b.link_url, b.created_at
     FROM platform_broadcasts b
     WHERE b.targets @> '["web_staff"]'::jsonb
       AND NOT EXISTS (
         SELECT 1 FROM web_notification_receipts r
         WHERE r.broadcast_id = b.id AND r.user_id = $1
       )
     ORDER BY b.created_at ASC
     LIMIT 5`,
    [userId],
  );
  return rowsToCamel(result.rows);
}

export async function ackWebBroadcast(userId: string, tenantId: string, broadcastId: string) {
  await query(
    `INSERT INTO web_notification_receipts (broadcast_id, user_id, tenant_id, read_at)
     VALUES ($1,$2,$3,NOW())
     ON CONFLICT (broadcast_id, user_id) DO UPDATE SET read_at = NOW()`,
    [broadcastId, userId, tenantId],
  );
  return { ok: true };
}
