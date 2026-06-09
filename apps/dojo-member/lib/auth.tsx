import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createApi } from "./api";
import { registerMemberPush } from "./push";
import * as storage from "./storage";
import type { Member, PortalInfo, Subscription } from "./types";

type AuthState = {
  loading: boolean;
  slug: string;
  clubName: string;
  portalInfo: PortalInfo | null;
  member: Member | null;
  activeSubscription: Subscription | null;
  setSlug: (slug: string) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<{ sentVia: string }>;
  loginWithOtp: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  api: ReturnType<typeof createApi>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [slug, setSlugState] = useState("");
  const [clubName, setClubName] = useState("");
  const [portalInfo, setPortalInfo] = useState<PortalInfo | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [api] = useState(() => createApi());

  const loadClubInfo = useCallback(async (clubSlug: string) => {
    const info = await createApi().get<PortalInfo>(`/api/portal/${clubSlug}/info`);
    setPortalInfo(info);
    setClubName(info.name);
  }, []);

  const refresh = useCallback(async () => {
    const token = await storage.getToken();
    if (!token) {
      setMember(null);
      setActiveSubscription(null);
      setLoading(false);
      return;
    }
    api.setToken(token);
    try {
      const data = await api.get<{ member: Member; activeSubscription: Subscription | null }>("/api/portal/me");
      setMember(data.member);
      setActiveSubscription(data.activeSubscription);
      registerMemberPush(api).catch(() => {});
    } catch {
      await storage.clearToken();
      api.setToken(null);
      setMember(null);
      setActiveSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    (async () => {
      const savedSlug = await storage.getSlug();
      if (savedSlug) {
        setSlugState(savedSlug);
        try {
          await loadClubInfo(savedSlug);
        } catch {
          // club not found — user can re-enter
        }
      }
      const token = await storage.getToken();
      if (token) api.setToken(token);
      await refresh();
      if (!token) setLoading(false);
    })();
  }, [api, loadClubInfo, refresh]);

  const setSlug = useCallback(
    async (value: string) => {
      const normalized = value.trim().toLowerCase();
      await storage.setSlug(normalized);
      setSlugState(normalized);
      await loadClubInfo(normalized);
    },
    [loadClubInfo],
  );

  const login = useCallback(
    async (phone: string, password: string) => {
      const result = await createApi().post<{
        token: string;
        tenant: { name: string };
      }>(`/api/portal/${slug}/login`, { phone, password });
      await storage.setToken(result.token);
      api.setToken(result.token);
      setClubName(result.tenant.name);
      await refresh();
    },
    [api, refresh, slug],
  );

  const requestOtp = useCallback(
    (phone: string) => createApi().post<{ sentVia: string }>(`/api/portal/${slug}/otp/request`, { phone }),
    [slug],
  );

  const loginWithOtp = useCallback(
    async (phone: string, code: string) => {
      const result = await createApi().post<{
        token: string;
        tenant: { name: string };
      }>(`/api/portal/${slug}/otp/verify`, { phone, code });
      await storage.setToken(result.token);
      api.setToken(result.token);
      setClubName(result.tenant.name);
      await refresh();
    },
    [api, refresh, slug],
  );

  const logout = useCallback(async () => {
    await storage.clearToken();
    api.setToken(null);
    setMember(null);
    setActiveSubscription(null);
  }, [api]);

  const value = useMemo(
    () => ({
      loading,
      slug,
      clubName,
      portalInfo,
      member,
      activeSubscription,
      setSlug,
      login,
      requestOtp,
      loginWithOtp,
      logout,
      refresh,
      api,
    }),
    [
      loading,
      slug,
      clubName,
      portalInfo,
      member,
      activeSubscription,
      setSlug,
      login,
      requestOtp,
      loginWithOtp,
      logout,
      refresh,
      api,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth required");
  return ctx;
}
