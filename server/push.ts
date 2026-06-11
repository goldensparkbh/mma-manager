import { query } from "./db/index.js";

export async function registerPushToken(params: {
  tenantId: string;
  accountType: "member" | "staff";
  expoPushToken: string;
  platform?: string;
  userId?: string | null;
  memberId?: string | null;
}) {
  await query(
    `INSERT INTO push_device_tokens (tenant_id, account_type, user_id, member_id, expo_push_token, platform, is_active, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,true,NOW())
     ON CONFLICT (expo_push_token) DO UPDATE SET
       tenant_id = EXCLUDED.tenant_id,
       account_type = EXCLUDED.account_type,
       user_id = EXCLUDED.user_id,
       member_id = EXCLUDED.member_id,
       platform = EXCLUDED.platform,
       is_active = true,
       updated_at = NOW()`,
    [
      params.tenantId,
      params.accountType,
      params.userId || null,
      params.memberId || null,
      params.expoPushToken,
      params.platform || null,
    ],
  );
}

export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  opts?: { accessToken?: string },
): Promise<number> {
  if (!tokens.length) return 0;
  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data: data || {},
  }));

  const chunks: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (opts?.accessToken) {
    headers.Authorization = `Bearer ${opts.accessToken}`;
  }

  let sent = 0;
  for (const chunk of chunks) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers,
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length;
      else console.error("[push] expo error", await res.text());
    } catch (err) {
      console.error("[push] send failed", err);
    }
  }
  return sent;
}

export async function pushToMember(
  tenantId: string,
  memberId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const result = await query(
    `SELECT expo_push_token FROM push_device_tokens
     WHERE tenant_id = $1 AND member_id = $2 AND account_type = 'member' AND is_active = true`,
    [tenantId, memberId],
  );
  const tokens = result.rows.map((r) => r.expo_push_token as string);
  return sendExpoPush(tokens, title, body, data);
}

export async function pushToStaffUser(
  tenantId: string,
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const result = await query(
    `SELECT expo_push_token FROM push_device_tokens
     WHERE tenant_id = $1 AND user_id = $2 AND account_type = 'staff' AND is_active = true`,
    [tenantId, userId],
  );
  const tokens = result.rows.map((r) => r.expo_push_token as string);
  return sendExpoPush(tokens, title, body, data);
}
