import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createApi } from "./api";
import { parsePlanFeatures, isFreePlan as checkFreePlan } from "./plan";
import { registerStaffPush } from "./push";
import * as storage from "./storage";
import type { PlanLimits, StaffUser, Tenant, TenantSubscription } from "./types";

type AuthState = {
  loading: boolean;
  user: StaffUser | null;
  tenant: Tenant | null;
  subscription: TenantSubscription | null;
  planFeatures: string[];
  planLimits: PlanLimits | null;
  isFreePlan: boolean;
  hasPlanFeature: (feature: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  registerClub: (data: {
    clubName: string;
    email: string;
    password: string;
    adminName: string;
    phone?: string;
    clubType?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  api: ReturnType<typeof createApi>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StaffUser | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [api] = useState(() => createApi());

  const applyMe = useCallback((data: {
    user: StaffUser;
    tenant: Tenant;
    subscription?: TenantSubscription;
    planFeatures?: string[];
    planLimits?: PlanLimits;
  }) => {
    setUser(data.user);
    setTenant(data.tenant);
    setSubscription(data.subscription || null);
    const features = parsePlanFeatures(data.planFeatures || data.subscription?.features);
    setPlanFeatures(features);
    setPlanLimits(data.planLimits || null);
  }, []);

  const refresh = useCallback(async () => {
    const token = await storage.getToken();
    if (!token) {
      setUser(null);
      setTenant(null);
      setSubscription(null);
      setPlanFeatures([]);
      setPlanLimits(null);
      setLoading(false);
      return;
    }
    api.setToken(token);
    try {
      const data = await api.get<{
        user: StaffUser;
        tenant: Tenant;
        subscription?: TenantSubscription;
        planFeatures?: string[];
        planLimits?: PlanLimits;
      }>("/api/auth/me");
      applyMe(data);
      registerStaffPush(api).catch(() => {});
    } catch {
      await storage.clearToken();
      api.setToken(null);
      setUser(null);
      setTenant(null);
      setSubscription(null);
      setPlanFeatures([]);
      setPlanLimits(null);
    } finally {
      setLoading(false);
    }
  }, [api, applyMe]);

  useEffect(() => {
    (async () => {
      const token = await storage.getToken();
      if (token) api.setToken(token);
      await refresh();
      if (!token) setLoading(false);
    })();
  }, [api, refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await createApi().post<{
        token: string;
        user: StaffUser & { isPlatformAdmin?: boolean };
        tenant?: Tenant;
      }>("/api/auth/login", { email, password });
      if (result.user.isPlatformAdmin || !result.tenant) {
        throw new Error("Use the web dashboard for platform admin accounts");
      }
      await storage.setToken(result.token);
      api.setToken(result.token);
      await refresh();
    },
    [api, refresh],
  );

  const registerClub = useCallback(
    async (data: {
      clubName: string;
      email: string;
      password: string;
      adminName: string;
      phone?: string;
      clubType?: string;
    }) => {
      const result = await createApi().post<{ token: string }>("/api/auth/register", {
        ...data,
        planSlug: "free",
      });
      await storage.setToken(result.token);
      api.setToken(result.token);
      await refresh();
    },
    [api, refresh],
  );

  const logout = useCallback(async () => {
    await storage.clearToken();
    api.setToken(null);
    setUser(null);
    setTenant(null);
    setSubscription(null);
    setPlanFeatures([]);
    setPlanLimits(null);
  }, [api]);

  const hasPlanFeature = useCallback(
    (feature: string) => {
      if (planFeatures.includes("*")) return true;
      return planFeatures.includes(feature);
    },
    [planFeatures],
  );

  const value = useMemo(
    () => ({
      loading,
      user,
      tenant,
      subscription,
      planFeatures,
      planLimits,
      isFreePlan: checkFreePlan(subscription?.planSlug || planLimits?.planSlug),
      hasPlanFeature,
      login,
      registerClub,
      logout,
      refresh,
      api,
    }),
    [loading, user, tenant, subscription, planFeatures, planLimits, hasPlanFeature, login, registerClub, logout, refresh, api],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth required");
  return ctx;
}
