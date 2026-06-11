import { Linking } from "react-native";
import { getApiUrl } from "./config";

export function getWebDashboardUrl(path = "/billing"): string {
  const base = getApiUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function openWebDashboard(path = "/billing") {
  return Linking.openURL(getWebDashboardUrl(path));
}

export function parsePlanFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function hasPlanFeature(features: string[] | undefined, feature: string): boolean {
  if (!features?.length) return false;
  if (features.includes("*")) return true;
  return features.includes(feature);
}

export function isFreePlan(planSlug?: string | null): boolean {
  return !planSlug || planSlug === "free";
}
