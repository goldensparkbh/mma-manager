const TAP_API = "https://api.tap.company/v2";

function getSecretKey(): string {
  const key = process.env.TAP_SECRET_KEY?.trim();
  if (!isTapConfigured()) throw new Error("TAP payment gateway is not configured — add your sk_test_ or sk_live_ key from https://os.tap.company");
  return key!;
}

export function isTapConfigured(): boolean {
  const key = process.env.TAP_SECRET_KEY?.trim();
  if (!key) return false;
  if (key.includes("xxxxx") || key.endsWith("...")) return false;
  return key.startsWith("sk_test_") || key.startsWith("sk_live_");
}

export function getTapPhoneCountryCode(): string {
  return process.env.TAP_PHONE_COUNTRY_CODE || "973";
}

export function getAppBaseUrl(): string {
  return (process.env.APP_URL || process.env.CORS_ORIGIN || "http://localhost:5173").replace(/\/$/, "");
}

export type TapChargeResponse = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  transaction?: { url?: string };
  response?: { code: string; message: string };
  customer?: { email?: string };
  metadata?: Record<string, string>;
};

export async function createTapCharge(params: {
  amount: number;
  currency: string;
  customer: { firstName: string; email: string; phone?: string };
  description: string;
  metadata: Record<string, string>;
  redirectUrl: string;
  webhookUrl: string;
  saveCard?: boolean;
  sourceId?: string;
}): Promise<TapChargeResponse> {
  const body = {
    amount: params.amount,
    currency: params.currency,
    threeDSecure: true,
    save_card: params.saveCard ?? false,
    description: params.description,
    statement_descriptor: "Nawady",
    metadata: params.metadata,
    reference: { transaction: params.metadata.paymentId, order: params.metadata.tenantId },
    receipt: { email: true, sms: false },
    customer: {
      first_name: params.customer.firstName,
      email: params.customer.email,
      phone: params.customer.phone
        ? { country_code: getTapPhoneCountryCode(), number: params.customer.phone.replace(/\D/g, "").slice(-8) }
        : undefined,
    },
    source: { id: params.sourceId || process.env.TAP_SOURCE_ID || "src_all" },
    post: { url: params.webhookUrl },
    redirect: { url: params.redirectUrl },
  };

  const res = await fetch(`${TAP_API}/charges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as TapChargeResponse & { errors?: { description: string }[] };
  if (!res.ok) {
    const msg = data.errors?.[0]?.description || data.response?.message || "TAP charge failed";
    throw new Error(msg);
  }
  return data;
}

export async function retrieveTapCharge(chargeId: string): Promise<TapChargeResponse> {
  const res = await fetch(`${TAP_API}/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });
  const data = (await res.json()) as TapChargeResponse & { errors?: { description: string }[] };
  if (!res.ok) {
    throw new Error(data.errors?.[0]?.description || "Failed to retrieve TAP charge");
  }
  return data;
}

export function isTapChargeSuccessful(status: string): boolean {
  return ["CAPTURED", "SUCCESS"].includes(status.toUpperCase());
}
