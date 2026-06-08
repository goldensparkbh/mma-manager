import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Member, Subscription } from "@shared/schema";
import { clearPortalToken, getPortalToken, portalApiJson, setPortalToken } from "@/lib/portal-api";

type PortalAuthValue = {
  slug: string;
  loading: boolean;
  member: Member | null;
  activeSubscription: Subscription | null;
  clubName: string;
  login: (phone: string, password: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<{ sentVia: string }>;
  loginWithOtp: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const PortalAuthContext = createContext<PortalAuthValue | null>(null);

export function PortalAuthProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [clubName, setClubName] = useState("");

  const refresh = useCallback(async () => {
    if (!getPortalToken()) {
      setMember(null);
      setActiveSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const data = await portalApiJson<{
        member: Member;
        activeSubscription: Subscription | null;
      }>("/api/portal/me");
      setMember(data.member);
      setActiveSubscription(data.activeSubscription);
    } catch {
      clearPortalToken();
      setMember(null);
      setActiveSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    portalApiJson<{ name: string }>(`/api/portal/${slug}/info`)
      .then((info) => setClubName(info.name))
      .catch(() => setClubName(""));
    refresh();
  }, [slug, refresh]);

  const login = useCallback(async (phone: string, password: string) => {
    const result = await portalApiJson<{
      token: string;
      member: Member;
      tenant: { name: string };
    }>(`/api/portal/${slug}/login`, {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
    setPortalToken(result.token);
    setClubName(result.tenant.name);
    await refresh();
  }, [slug, refresh]);

  const requestOtp = useCallback(async (phone: string) => {
    return portalApiJson<{ sentVia: string }>(`/api/portal/${slug}/otp/request`, {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }, [slug]);

  const loginWithOtp = useCallback(async (phone: string, code: string) => {
    const result = await portalApiJson<{
      token: string;
      member: Member;
      tenant: { name: string };
    }>(`/api/portal/${slug}/otp/verify`, {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
    setPortalToken(result.token);
    setClubName(result.tenant.name);
    await refresh();
  }, [slug, refresh]);

  const logout = useCallback(() => {
    clearPortalToken();
    setMember(null);
    setActiveSubscription(null);
  }, []);

  const value = useMemo(
    () => ({ slug, loading, member, activeSubscription, clubName, login, requestOtp, loginWithOtp, logout, refresh }),
    [slug, loading, member, activeSubscription, clubName, login, requestOtp, loginWithOtp, logout, refresh],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used within PortalAuthProvider");
  return ctx;
}
