import { query } from "./db/index.js";
import { rowsToCamel, toCamelCase } from "./utils.js";

export type TransactionBillingConfig = {
  enabled: boolean;
  feeFlat: number;
  feePercent: number;
  currency: string;
};

const CONFIG_KEY = "transaction_billing";

const DEFAULT_CONFIG: TransactionBillingConfig = {
  enabled: false,
  feeFlat: 0.5,
  feePercent: 0,
  currency: process.env.TAP_CURRENCY || "BHD",
};

export function roundMoney(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function calculateTransactionFee(
  packageAmount: number,
  config: TransactionBillingConfig,
): { packageAmount: number; platformFee: number; totalAmount: number } {
  if (!config.enabled || packageAmount <= 0) {
    return { packageAmount, platformFee: 0, totalAmount: packageAmount };
  }
  const percentFee = roundMoney((packageAmount * (config.feePercent || 0)) / 100);
  const platformFee = roundMoney((config.feeFlat || 0) + percentFee);
  return {
    packageAmount,
    platformFee,
    totalAmount: roundMoney(packageAmount + platformFee),
  };
}

export async function getTransactionBillingConfig(): Promise<TransactionBillingConfig> {
  const row = await query("SELECT value FROM platform_settings WHERE key = $1", [CONFIG_KEY]);
  const stored = (row.rows[0]?.value as Partial<TransactionBillingConfig>) || {};
  return {
    enabled: stored.enabled ?? DEFAULT_CONFIG.enabled,
    feeFlat: stored.feeFlat ?? DEFAULT_CONFIG.feeFlat,
    feePercent: stored.feePercent ?? DEFAULT_CONFIG.feePercent,
    currency: stored.currency || DEFAULT_CONFIG.currency,
  };
}

export async function updateTransactionBillingConfig(updates: Partial<TransactionBillingConfig>) {
  const current = await getTransactionBillingConfig();
  const next: TransactionBillingConfig = {
    enabled: updates.enabled ?? current.enabled,
    feeFlat: updates.feeFlat ?? current.feeFlat,
    feePercent: updates.feePercent ?? current.feePercent,
    currency: updates.currency || current.currency,
  };
  await query(
    `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [CONFIG_KEY, JSON.stringify(next)],
  );
  return getTransactionBillingConfig();
}

export async function getTransactionFeeStats() {
  const [totals, recent] = await Promise.all([
    query<{ count: number; fees: string; volume: string }>(
      `SELECT COUNT(*)::int AS count,
              COALESCE(SUM(platform_fee), 0)::text AS fees,
              COALESCE(SUM(package_amount), 0)::text AS volume
       FROM member_payments WHERE status = 'captured' AND platform_fee > 0`,
    ),
    query(
      `SELECT mp.id, mp.package_amount, mp.platform_fee, mp.amount, mp.currency, mp.paid_at,
              mp.package_name, t.name AS tenant_name
       FROM member_payments mp
       JOIN tenants t ON t.id = mp.tenant_id
       WHERE mp.status = 'captured' AND mp.platform_fee > 0
       ORDER BY mp.paid_at DESC NULLS LAST LIMIT 50`,
    ),
  ]);
  return {
    capturedCount: totals.rows[0]?.count ?? 0,
    totalFees: Number(totals.rows[0]?.fees ?? 0),
    totalVolume: Number(totals.rows[0]?.volume ?? 0),
    recent: rowsToCamel(recent.rows),
  };
}

export async function enrichPackagePricing<T extends { price: number | string }>(
  pkg: T,
): Promise<T & { packageAmount: number; platformFee: number; totalAmount: number }> {
  const config = await getTransactionBillingConfig();
  const packageAmount = Number(pkg.price);
  const breakdown = calculateTransactionFee(packageAmount, config);
  return {
    ...pkg,
    packageAmount: breakdown.packageAmount,
    platformFee: breakdown.platformFee,
    totalAmount: breakdown.totalAmount,
  };
}
