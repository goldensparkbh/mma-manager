import type { Tenant } from "@shared/schema";

export type SubscriptionBlockReason =
  | "subscription_suspended"
  | "subscription_cancelled"
  | "trial_expired";

export function getTenantSubscriptionStatus(tenant: Tenant | null): {
  active: boolean;
  reason?: SubscriptionBlockReason;
} {
  if (!tenant) return { active: false, reason: "subscription_suspended" };
  if (tenant.status === "suspended") return { active: false, reason: "subscription_suspended" };
  if (tenant.status === "cancelled") return { active: false, reason: "subscription_cancelled" };
  if (
    tenant.status === "trial" &&
    tenant.trialEndsAt &&
    new Date(tenant.trialEndsAt) < new Date()
  ) {
    return { active: false, reason: "trial_expired" };
  }
  return { active: true };
}
