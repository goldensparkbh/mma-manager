import { query } from "./db/index.js";

export type SmsProvider = "twilio" | "console";

export type SmsConfig = {
  enabled: boolean;
  provider: SmsProvider;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  otpMessageTemplate: string;
};

const CONFIG_KEY = "sms_config";

const DEFAULT_CONFIG: SmsConfig = {
  enabled: true,
  provider: "twilio",
  accountSid: process.env.SMS_ACCOUNT_SID || "",
  authToken: process.env.SMS_AUTH_TOKEN || "",
  fromNumber: process.env.SMS_FROM_NUMBER || "",
  otpMessageTemplate: "Your {clubName} code: {code}. Valid 10 minutes.",
};

export async function getSmsConfig(): Promise<SmsConfig & { hasAuthToken: boolean }> {
  const row = await query("SELECT value FROM platform_settings WHERE key = $1", [CONFIG_KEY]);
  const stored = (row.rows[0]?.value as Partial<SmsConfig>) || {};
  const merged: SmsConfig = {
    enabled: stored.enabled ?? DEFAULT_CONFIG.enabled,
    provider: stored.provider || DEFAULT_CONFIG.provider,
    accountSid: stored.accountSid || DEFAULT_CONFIG.accountSid,
    authToken: stored.authToken || DEFAULT_CONFIG.authToken,
    fromNumber: stored.fromNumber || DEFAULT_CONFIG.fromNumber,
    otpMessageTemplate: stored.otpMessageTemplate || DEFAULT_CONFIG.otpMessageTemplate,
  };
  return {
    ...merged,
    authToken: merged.authToken ? "••••••••" : "",
    hasAuthToken: Boolean(stored.authToken || process.env.SMS_AUTH_TOKEN),
  };
}

export async function getSmsConfigForSend(): Promise<SmsConfig> {
  const row = await query("SELECT value FROM platform_settings WHERE key = $1", [CONFIG_KEY]);
  const stored = (row.rows[0]?.value as Partial<SmsConfig>) || {};
  return {
    enabled: stored.enabled ?? DEFAULT_CONFIG.enabled,
    provider: stored.provider || DEFAULT_CONFIG.provider,
    accountSid: stored.accountSid || DEFAULT_CONFIG.accountSid,
    authToken: stored.authToken || DEFAULT_CONFIG.authToken,
    fromNumber: stored.fromNumber || DEFAULT_CONFIG.fromNumber,
    otpMessageTemplate: stored.otpMessageTemplate || DEFAULT_CONFIG.otpMessageTemplate,
  };
}

export async function updateSmsConfig(updates: Partial<SmsConfig> & { authToken?: string }) {
  const current = await getSmsConfigForSend();
  const next: SmsConfig = {
    enabled: updates.enabled ?? current.enabled,
    provider: updates.provider ?? current.provider,
    accountSid: updates.accountSid ?? current.accountSid,
    fromNumber: updates.fromNumber ?? current.fromNumber,
    otpMessageTemplate: updates.otpMessageTemplate ?? current.otpMessageTemplate,
    authToken:
      updates.authToken !== undefined && updates.authToken !== "••••••••"
        ? updates.authToken
        : current.authToken,
  };
  await query(
    `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [CONFIG_KEY, JSON.stringify(next)],
  );
  return getSmsConfig();
}

export function formatOtpMessage(template: string, clubName: string, code: string): string {
  return template.replace(/\{clubName\}/g, clubName).replace(/\{code\}/g, code);
}
