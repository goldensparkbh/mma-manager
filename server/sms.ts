import type { SmsConfig } from "./platformSms.js";

export function isSmsConfigured(config?: Pick<SmsConfig, "enabled" | "provider" | "accountSid" | "authToken" | "fromNumber">): boolean {
  if (config) {
    if (!config.enabled) return false;
    if (config.provider === "console") return false;
    const sid = config.accountSid?.trim();
    const token = config.authToken?.trim();
    const from = config.fromNumber?.trim();
    return !!(sid && token && from && !sid.includes("xxx"));
  }
  const sid = process.env.SMS_ACCOUNT_SID?.trim();
  const token = process.env.SMS_AUTH_TOKEN?.trim();
  const from = process.env.SMS_FROM_NUMBER?.trim();
  return !!(sid && token && from && !sid.includes("xxx"));
}

export async function sendSms(to: string, body: string, config?: SmsConfig): Promise<boolean> {
  let cfg = config;
  if (!cfg) {
    const { getSmsConfigForSend } = await import("./platformSms.js");
    cfg = await getSmsConfigForSend();
  }

  if (!cfg.enabled || cfg.provider === "console") {
    console.log(`[sms] (console) → ${to}: ${body}`);
    return false;
  }

  if (!isSmsConfigured(cfg)) {
    console.log(`[sms] (not configured) → ${to}: ${body}`);
    return false;
  }

  const sid = cfg.accountSid;
  const token = cfg.authToken;
  const from = cfg.fromNumber;
  const digits = to.replace(/\D/g, "");

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: `+${digits}`, From: from, Body: body });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[sms] failed:", err);
    return false;
  }
  return true;
}
