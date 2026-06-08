import { query } from "./db/index.js";
import { createTapCharge, getAppBaseUrl, isTapChargeSuccessful, isTapConfigured, retrieveTapCharge } from "./tap.js";
import { toCamelCase, formatDate } from "./utils.js";
import { createSale, createSubscription, getMember, syncMemberSubscriptionStatus } from "./data.js";
import { enqueueNotification, notifyMember } from "./notifications.js";
import { getBookingSettings } from "./bookings.js";

function nextMemberInvoiceNumber(): string {
  return `M-${Date.now()}`;
}

export async function isMemberTapEnabled(tenantId: string): Promise<boolean> {
  if (!isTapConfigured()) return false;
  const settings = await getBookingSettings(tenantId);
  return settings.portalEnabled !== false && (settings as { tapEnabled?: boolean }).tapEnabled !== false;
}

export async function createMemberCheckout(params: {
  tenantId: string;
  memberId: string;
  packageId: string;
  saveCard?: boolean;
}) {
  if (!isTapConfigured()) throw new Error("Online payments are not configured");

  const pkgResult = await query(
    "SELECT * FROM packages WHERE tenant_id = $1 AND id = $2",
    [params.tenantId, params.packageId],
  );
  const pkg = pkgResult.rows[0];
  if (!pkg) throw new Error("Package not found");

  const member = await getMember(params.tenantId, params.memberId);
  if (!member) throw new Error("Member not found");

  const amount = Number(pkg.price);
  if (!amount) throw new Error("Invalid package price");

  const currency = process.env.TAP_CURRENCY || "BHD";
  const paymentResult = await query(
    `INSERT INTO member_payments (tenant_id, member_id, package_id, amount, currency, status, package_name, payment_type)
     VALUES ($1,$2,$3,$4,$5,'pending',$6,'one_time') RETURNING *`,
    [params.tenantId, params.memberId, params.packageId, amount, currency, pkg.name],
  );
  const payment = toCamelCase(paymentResult.rows[0]) as { id: string };

  const baseUrl = getAppBaseUrl();
  const tenantRow = await query("SELECT slug FROM tenants WHERE id = $1", [params.tenantId]);
  const slug = (tenantRow.rows[0]?.slug as string) || "portal";
  const m = member as { name: string; email?: string; phone: string };
  const charge = await createTapCharge({
    amount,
    currency,
    customer: {
      firstName: m.name,
      email: m.email || `${m.phone}@member.local`,
      phone: m.phone,
    },
    description: `${pkg.name} membership`,
    metadata: {
      type: "member",
      paymentId: payment.id,
      tenantId: params.tenantId,
      memberId: params.memberId,
      packageId: params.packageId,
    },
    redirectUrl: `${baseUrl}/portal/${slug}/payment/result`,
    webhookUrl: `${baseUrl}/api/webhooks/tap`,
    saveCard: params.saveCard ?? true,
  });

  await query("UPDATE member_payments SET tap_charge_id = $2, metadata = $3 WHERE id = $1", [
    payment.id,
    charge.id,
    JSON.stringify({ tapStatus: charge.status }),
  ]);

  const payUrl = charge.transaction?.url;
  if (!payUrl) throw new Error("No payment URL returned from TAP");
  return { paymentId: payment.id, url: payUrl, chargeId: charge.id };
}

export async function confirmMemberPayment(tapChargeId: string) {
  const charge = await retrieveTapCharge(tapChargeId);
  const paymentRow = await query("SELECT * FROM member_payments WHERE tap_charge_id = $1", [tapChargeId]);
  const payment = paymentRow.rows[0];
  if (!payment) return { ok: false, status: charge.status, reason: "Payment record not found" };

  if (payment.status === "captured") {
    return { ok: true, status: "CAPTURED", payment: toCamelCase(payment) };
  }

  if (!isTapChargeSuccessful(charge.status)) {
    await query(
      "UPDATE member_payments SET status = 'failed', metadata = metadata || $2::jsonb WHERE id = $1",
      [payment.id, JSON.stringify({ tapStatus: charge.status })],
    );
    await handleFailedMemberPayment(payment);
    return { ok: false, status: charge.status, payment: toCamelCase(payment) };
  }

  return activateMemberPayment(payment, charge);
}

async function activateMemberPayment(payment: Record<string, unknown>, charge: { id: string; card?: { id?: string; last_four?: string; brand?: string } }) {
  const tenantId = payment.tenant_id as string;
  const memberId = payment.member_id as string;
  const packageId = payment.package_id as string;

  const pkgResult = await query("SELECT * FROM packages WHERE id = $1", [packageId]);
  const pkg = pkgResult.rows[0];
  if (!pkg) throw new Error("Package not found");

  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + Number(pkg.duration));

  const member = await getMember(tenantId, memberId);
  const sub = await createSubscription(tenantId, {
    memberId,
    memberName: (member as { name: string }).name,
    planName: pkg.name,
    amount: Number(pkg.price),
    startDate: formatDate(today),
    endDate: formatDate(end),
    status: "active",
    paymentStatus: "paid",
    paymentMethod: "tap",
    packageType: pkg.package_type || "duration",
    sessionsTotal: pkg.session_count || null,
    sessionsRemaining: pkg.session_count || null,
  });

  const invoiceNumber = (payment.invoice_number as string) || nextMemberInvoiceNumber();
  const paidAt = new Date();
  await query(
    `UPDATE member_payments SET status = 'captured', paid_at = $2, subscription_id = $3, invoice_number = $4,
     metadata = metadata || $5::jsonb WHERE id = $1`,
    [payment.id, paidAt.toISOString(), (sub as { id: string }).id, invoiceNumber, JSON.stringify({ tapStatus: "CAPTURED" })],
  );

  const card = (charge as { card?: { id?: string; last_four?: string; brand?: string } }).card;
  if (card?.id) {
    await query("DELETE FROM member_payment_methods WHERE tenant_id = $1 AND member_id = $2", [tenantId, memberId]);
    await query(
      `INSERT INTO member_payment_methods (tenant_id, member_id, tap_card_id, last_four, brand, is_default)
       VALUES ($1,$2,$3,$4,$5,true)`,
      [tenantId, memberId, card.id, card.last_four || null, card.brand || null],
    );
  }

  const m = member as { name: string; email?: string; phone: string };
  await createSale(tenantId, {
    productId: "subscription",
    productName: pkg.name as string,
    quantity: 1,
    unitPrice: Number(pkg.price),
    totalPrice: Number(pkg.price),
    memberId,
    buyerName: m.name,
    buyerPhone: m.phone,
    paymentMethod: "tap",
    paymentStatus: "paid",
    subscriptionId: (sub as { id: string }).id,
    receiptId: invoiceNumber,
  });

  await notifyMember({
    tenantId,
    memberId,
    eventKey: "payment_received",
    email: m.email,
    phone: m.phone,
    vars: {
      name: m.name,
      planName: pkg.name as string,
      amount: String(pkg.price),
      currency: (payment.currency as string) || "BHD",
    },
  });

  await syncMemberSubscriptionStatus(tenantId, memberId);

  try {
    const { dispatchWebhooks } = await import("./webhooks.js");
    await dispatchWebhooks(tenantId, "payment.received", {
      paymentId: payment.id,
      memberId,
      amount: pkg.price,
      packageName: pkg.name,
    });
  } catch { /* optional */ }

  const updated = await query("SELECT * FROM member_payments WHERE id = $1", [payment.id]);
  return { ok: true, status: "CAPTURED", payment: toCamelCase(updated.rows[0]), subscription: sub };
}

export async function refundMemberPayment(tenantId: string, paymentId: string, reason?: string) {
  const settings = await getBookingSettings(tenantId);
  if (!settings.allowRefunds) throw new Error("Refunds are not enabled");

  const paymentRow = await query(
    "SELECT * FROM member_payments WHERE tenant_id = $1 AND id = $2",
    [tenantId, paymentId],
  );
  const payment = paymentRow.rows[0];
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "captured") throw new Error("Only captured payments can be refunded");

  if (payment.paid_at) {
    const hoursSince = (Date.now() - new Date(payment.paid_at as string).getTime()) / 3_600_000;
    if (hoursSince > settings.refundWindowHours) {
      throw new Error(`Refund window is ${settings.refundWindowHours} hours`);
    }
  }

  await query(
    `UPDATE member_payments SET status = 'refunded', metadata = metadata || $3::jsonb WHERE id = $1 AND tenant_id = $2`,
    [paymentId, tenantId, JSON.stringify({ refundReason: reason || "staff_refund" })],
  );

  if (payment.subscription_id) {
    await query(
      "UPDATE subscriptions SET status = 'cancelled' WHERE tenant_id = $1 AND id = $2",
      [tenantId, payment.subscription_id],
    );
    await syncMemberSubscriptionStatus(tenantId, payment.member_id as string);
  }

  return { ok: true, paymentId };
}

async function handleFailedMemberPayment(payment: Record<string, unknown>) {
  const tenantId = payment.tenant_id as string;
  const memberId = payment.member_id as string;
  const member = await getMember(tenantId, memberId);
  if (!member) return;

  const m = member as { name: string; email?: string; phone: string };
  const settings = await getBookingSettings(tenantId);
  const graceDays = settings.paymentGraceDays ?? 3;

  if (payment.subscription_id) {
    await query(
      `UPDATE subscriptions SET end_date = end_date + $2::int, payment_status = 'pending'
       WHERE tenant_id = $1 AND id = $3`,
      [tenantId, graceDays, payment.subscription_id],
    );
    await syncMemberSubscriptionStatus(tenantId, memberId);
  }

  const pkgName = (payment.package_name as string) || "membership";
  await notifyMember({
    tenantId,
    memberId,
    eventKey: "payment_failed",
    email: m.email,
    phone: m.phone,
    vars: { name: m.name, planName: pkgName, graceDays: String(graceDays) },
  });

  const admins = await query(
    "SELECT email FROM users WHERE tenant_id = $1 AND role = 'admin' AND email IS NOT NULL",
    [tenantId],
  );
  for (const admin of admins.rows) {
    await enqueueNotification({
      tenantId,
      eventKey: "payment_failed",
      recipient: admin.email as string,
      vars: { name: m.name, planName: pkgName, graceDays: String(graceDays) },
    });
  }
}

export async function processRecurringBilling(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const expiring = await query(
    `SELECT s.tenant_id, s.member_id, s.id AS subscription_id, s.plan_name,
            pm.tap_card_id, last_pay.package_id, last_pay.amount, last_pay.currency
     FROM subscriptions s
     JOIN member_payment_methods pm
       ON pm.member_id = s.member_id AND pm.tenant_id = s.tenant_id AND pm.tap_card_id IS NOT NULL
     JOIN LATERAL (
       SELECT package_id, amount, currency FROM member_payments
       WHERE member_id = s.member_id AND tenant_id = s.tenant_id
         AND status = 'captured' AND package_id IS NOT NULL
       ORDER BY paid_at DESC NULLS LAST LIMIT 1
     ) last_pay ON true
     WHERE s.end_date = $1 AND s.status = 'active'`,
    [today],
  );

  let count = 0;
  for (const row of expiring.rows) {
    const tenantId = row.tenant_id as string;
    if (!(await isMemberTapEnabled(tenantId))) continue;
    try {
      await createRecurringCharge({
        tenantId,
        memberId: row.member_id as string,
        packageId: row.package_id as string,
        tapCardId: row.tap_card_id as string,
        subscriptionId: row.subscription_id as string,
      });
      count++;
    } catch (err) {
      console.error("[recurring]", row.member_id, err);
    }
  }
  return count;
}

async function createRecurringCharge(params: {
  tenantId: string;
  memberId: string;
  packageId: string;
  tapCardId: string;
  subscriptionId: string;
}) {
  const pkgResult = await query(
    "SELECT * FROM packages WHERE tenant_id = $1 AND id = $2",
    [params.tenantId, params.packageId],
  );
  const pkg = pkgResult.rows[0];
  if (!pkg) throw new Error("Package not found");

  const member = await getMember(params.tenantId, params.memberId);
  if (!member) throw new Error("Member not found");

  const amount = Number(pkg.price);
  const currency = process.env.TAP_CURRENCY || "BHD";
  const paymentResult = await query(
    `INSERT INTO member_payments (tenant_id, member_id, package_id, amount, currency, status, package_name, payment_type, subscription_id)
     VALUES ($1,$2,$3,$4,$5,'pending',$6,'recurring',$7) RETURNING *`,
    [params.tenantId, params.memberId, params.packageId, amount, currency, pkg.name, params.subscriptionId],
  );
  const payment = toCamelCase(paymentResult.rows[0]) as { id: string };

  const m = member as { name: string; email?: string; phone: string };
  const charge = await createTapCharge({
    amount,
    currency,
    customer: {
      firstName: m.name,
      email: m.email || `${m.phone}@member.local`,
      phone: m.phone,
    },
    description: `${pkg.name} renewal`,
    metadata: {
      type: "member",
      paymentId: payment.id,
      tenantId: params.tenantId,
      memberId: params.memberId,
      packageId: params.packageId,
    },
    redirectUrl: getAppBaseUrl(),
    webhookUrl: `${getAppBaseUrl()}/api/webhooks/tap`,
    sourceId: params.tapCardId,
    saveCard: false,
  });

  await query("UPDATE member_payments SET tap_charge_id = $2 WHERE id = $1", [payment.id, charge.id]);

  if (!isTapChargeSuccessful(charge.status)) {
    await query(
      "UPDATE member_payments SET status = 'failed', metadata = $2::jsonb WHERE id = $1",
      [payment.id, JSON.stringify({ tapStatus: charge.status })],
    );
    const paymentRow = await query("SELECT * FROM member_payments WHERE id = $1", [payment.id]);
    await handleFailedMemberPayment(paymentRow.rows[0]);
    throw new Error(`Recurring charge failed: ${charge.status}`);
  }

  const paymentRow = await query("SELECT * FROM member_payments WHERE id = $1", [payment.id]);
  await activateMemberPayment(paymentRow.rows[0], charge);
}

export async function getMemberPayments(tenantId: string, memberId?: string) {
  const clauses = ["tenant_id = $1"];
  const values: unknown[] = [tenantId];
  if (memberId) {
    clauses.push("member_id = $2");
    values.push(memberId);
  }
  const result = await query(
    `SELECT * FROM member_payments WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC LIMIT 200`,
    values,
  );
  return result.rows.map((r) => toCamelCase(r));
}
