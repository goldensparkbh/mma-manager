import nodemailer from "nodemailer";

function isEmailConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return false;
  if (host.includes("example.com") || user === "..." || pass === "...") return false;
  return true;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("[email] SMTP not configured — skipping:", params.subject, "→", params.to);
    return false;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text || params.html.replace(/<[^>]+>/g, ""),
  });
  return true;
}

export async function sendTrialReminderEmail(params: {
  to: string;
  clubName: string;
  planName: string;
  daysLeft: number;
  trialEndDate: string;
  billingUrl: string;
}) {
  const urgency = params.daysLeft <= 1 ? "expires tomorrow" : `expires in ${params.daysLeft} days`;
  return sendEmail({
    to: params.to,
    subject: `Trial ${urgency} — ${params.clubName}`,
    html: `
      <h2>Your free trial is ending soon</h2>
      <p>Hello,</p>
      <p>Your trial for <strong>${params.clubName}</strong> on Nawady ${urgency}.</p>
      <ul>
        <li><strong>Plan:</strong> ${params.planName}</li>
        <li><strong>Trial ends:</strong> ${params.trialEndDate}</li>
      </ul>
      <p>To keep full access after the trial, complete payment via TAP:</p>
      <p><a href="${params.billingUrl}">${params.billingUrl}</a></p>
      <p>If payment is not completed before the trial ends, platform access will be locked until you subscribe.</p>
    `,
  });
}

export async function sendTrialExpiredEmail(params: {
  to: string;
  clubName: string;
  planName: string;
  billingUrl: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Trial ended — activate ${params.planName} for ${params.clubName}`,
    html: `
      <h2>Your free trial has ended</h2>
      <p>Hello,</p>
      <p>Your trial for <strong>${params.clubName}</strong> on Nawady has ended.</p>
      <p>To continue using the platform with your <strong>${params.planName}</strong> plan, please complete payment:</p>
      <p><a href="${params.billingUrl}">${params.billingUrl}</a></p>
      <p>Until payment is completed, access to the platform will remain locked.</p>
    `,
  });
}

export async function sendPaymentInvoiceEmail(params: {
  to: string;
  clubName: string;
  planName: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  billingCycle: string;
  paidAt: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Payment receipt ${params.invoiceNumber} — ${params.clubName}`,
    html: `
      <h2>Payment confirmed</h2>
      <p>Thank you for your payment.</p>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td><strong>Invoice</strong></td><td>${params.invoiceNumber}</td></tr>
        <tr><td><strong>Club</strong></td><td>${params.clubName}</td></tr>
        <tr><td><strong>Plan</strong></td><td>${params.planName} (${params.billingCycle})</td></tr>
        <tr><td><strong>Amount</strong></td><td>${params.amount} ${params.currency}</td></tr>
        <tr><td><strong>Paid at</strong></td><td>${params.paidAt}</td></tr>
      </table>
      <p>Your platform subscription is now active. You can sign in and continue managing your club.</p>
    `,
  });
}
