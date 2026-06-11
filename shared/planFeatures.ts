/** Platform SaaS plan feature flags — shared by server, web, and mobile. */

export const PLAN_SLUGS = {
  FREE: "free",
  STARTER: "starter",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
} as const;

export type PlanSlug = (typeof PLAN_SLUGS)[keyof typeof PLAN_SLUGS];

export const PLAN_FEATURES = {
  MEMBERS: "members",
  ATTENDANCE: "attendance",
  SUBSCRIPTIONS: "subscriptions",
  SCHEDULE: "schedule",
  REGISTRATIONS: "registrations",
  SETTINGS: "settings",
  USERS: "users",
  STORE: "store",
  SALES: "sales",
  FINANCE: "finance",
  ANALYTICS: "analytics",
  BELTS: "belts",
  CAMPS: "camps",
  LOGS: "logs",
  INTEGRATIONS: "integrations",
} as const;

export type PlanFeature = (typeof PLAN_FEATURES)[keyof typeof PLAN_FEATURES];

/** Features included in the free staff-app tier (same on web for free clubs). */
export const FREE_TIER_FEATURES: PlanFeature[] = [
  PLAN_FEATURES.MEMBERS,
  PLAN_FEATURES.ATTENDANCE,
  PLAN_FEATURES.SUBSCRIPTIONS,
  PLAN_FEATURES.SCHEDULE,
  PLAN_FEATURES.REGISTRATIONS,
  PLAN_FEATURES.SETTINGS,
  PLAN_FEATURES.USERS,
];

export const FEATURE_LABELS: Record<PlanFeature, { en: string; ar: string }> = {
  members: { en: "Members", ar: "الأعضاء" },
  attendance: { en: "Attendance", ar: "الحضور" },
  subscriptions: { en: "Packages", ar: "الباقات" },
  schedule: { en: "Classes & schedule", ar: "الجدول والحصص" },
  registrations: { en: "Class registrations", ar: "تسجيل الحصص" },
  settings: { en: "Club profile & branding", ar: "ملف النادي والعلامة" },
  users: { en: "Staff accounts", ar: "حسابات الموظفين" },
  store: { en: "Store & inventory", ar: "المتجر والمخزون" },
  sales: { en: "Point of sale", ar: "نقطة البيع" },
  finance: { en: "Finance & P&L", ar: "المالية والأرباح" },
  analytics: { en: "Analytics & reports", ar: "التقارير والتحليلات" },
  belts: { en: "Belts & progression", ar: "الأحزمة والتقدم" },
  camps: { en: "Camps & events", ar: "المخيمات والفعاليات" },
  logs: { en: "Activity logs", ar: "سجل النشاط" },
  integrations: { en: "Integrations & webhooks", ar: "التكامل والويب هوك" },
};

/** Minimum paid plan slug that unlocks a feature (for upgrade prompts). */
export const FEATURE_UPGRADE_PLAN: Partial<Record<PlanFeature, PlanSlug>> = {
  store: PLAN_SLUGS.PROFESSIONAL,
  sales: PLAN_SLUGS.PROFESSIONAL,
  finance: PLAN_SLUGS.PROFESSIONAL,
  analytics: PLAN_SLUGS.PROFESSIONAL,
  belts: PLAN_SLUGS.PROFESSIONAL,
  camps: PLAN_SLUGS.PROFESSIONAL,
  logs: PLAN_SLUGS.ENTERPRISE,
  integrations: PLAN_SLUGS.ENTERPRISE,
};

export function parsePlanFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function hasPlanFeature(features: string[] | undefined | null, feature: string): boolean {
  if (!features?.length) return false;
  if (features.includes("*")) return true;
  return features.includes(feature);
}

export function isFreePlan(planSlug?: string | null): boolean {
  return !planSlug || planSlug === PLAN_SLUGS.FREE;
}

/** Map API path prefixes to required plan features. */
export const API_FEATURE_GATES: { prefix: string; feature: PlanFeature }[] = [
  { prefix: "/products", feature: PLAN_FEATURES.STORE },
  { prefix: "/sales", feature: PLAN_FEATURES.SALES },
  { prefix: "/expenses", feature: PLAN_FEATURES.FINANCE },
  { prefix: "/finance", feature: PLAN_FEATURES.FINANCE },
  { prefix: "/analytics", feature: PLAN_FEATURES.ANALYTICS },
  { prefix: "/camps", feature: PLAN_FEATURES.CAMPS },
  { prefix: "/belts", feature: PLAN_FEATURES.BELTS },
  { prefix: "/logs", feature: PLAN_FEATURES.LOGS },
  { prefix: "/webhooks", feature: PLAN_FEATURES.INTEGRATIONS },
  { prefix: "/branches", feature: PLAN_FEATURES.INTEGRATIONS },
];
