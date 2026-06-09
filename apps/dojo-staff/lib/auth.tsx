import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createApi } from "./api";
import { registerStaffPush } from "./push";
import * as storage from "./storage";
import type { StaffUser, Tenant } from "./types";

type AuthState = {
  loading: boolean;
  user: StaffUser | null;
  tenant: Tenant | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  api: ReturnType<typeof createApi>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StaffUser | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [api] = useState(() => createApi());

  const refresh = useCallback(async () => {
    const token = await storage.getToken();
    if (!token) {
      setUser(null);
      setTenant(null);
      setLoading(false);
      return;
    }
    api.setToken(token);
    try {
      const data = await api.get<{
        user: StaffUser;
        tenant: Tenant;
      }>("/api/auth/me");
      setUser(data.user);
      setTenant(data.tenant);
      registerStaffPush(api).catch(() => {});
    } catch {
      await storage.clearToken();
      api.setToken(null);
      setUser(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

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

  const logout = useCallback(async () => {
    await storage.clearToken();
    api.setToken(null);
    setUser(null);
    setTenant(null);
  }, [api]);

  const value = useMemo(
    () => ({ loading, user, tenant, login, logout, refresh, api }),
    [loading, user, tenant, login, logout, refresh, api],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth required");
  return ctx;
}
