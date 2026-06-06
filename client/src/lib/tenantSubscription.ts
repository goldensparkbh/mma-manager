import type { Tenant, TenantSubscription } from "@shared/schema";

export type SubscriptionBlockReason =
  | "subscription_suspended"
  | "subscription_cancelled"
  | "trial_expired"
  | "subscription_expired";

export function getTenantSubscriptionStatus(
  tenant: Tenant | null,
  subscription?: TenantSubscription | null,
  serverBlockReason?: SubscriptionBlockReason | null,
): {
  active: boolean;
  reason?: SubscriptionBlockReason;
} {
  if (serverBlockReason) return { active: false, reason: serverBlockReason };
  if (!tenant) return { active: false, reason: "subscription_suspended" };
  if (tenant.status === "suspended") return { active: false, reason: "subscription_suspended" };
  if (tenant.status === "cancelled") return { active: false, reason: "subscription_cancelled" };

  const periodEnd = subscription?.currentPeriodEnd || tenant.trialEndsAt;
  if (periodEnd && new Date(periodEnd) < new Date()) {
    if (tenant.status === "trial" || subscription?.status === "trialing") {
      return { active: false, reason: "trial_expired" };
    }
    return { active: false, reason: "subscription_expired" };
  }

  return { active: true };
}
