export function isSmsConfigured(): boolean {
  const sid = process.env.SMS_ACCOUNT_SID?.trim();
  const token = process.env.SMS_AUTH_TOKEN?.trim();
  const from = process.env.SMS_FROM_NUMBER?.trim();
  return !!(sid && token && from && !sid.includes("xxx"));
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!isSmsConfigured()) {
    console.log(`[sms] (not configured) → ${to}: ${body}`);
    return false;
  }

  const sid = process.env.SMS_ACCOUNT_SID!;
  const token = process.env.SMS_AUTH_TOKEN!;
  const from = process.env.SMS_FROM_NUMBER!;
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
