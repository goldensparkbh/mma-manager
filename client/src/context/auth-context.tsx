import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiJson, setToken, clearToken, getToken } from "@/lib/api";
import { normalizeWhatsAppTemplates, type WhatsAppTemplate } from "@/lib/whatsapp";
import type { User, Tenant, TenantSubscription } from "@shared/schema";
import { getTenantSubscriptionStatus } from "@/lib/tenantSubscription";

type AuthUser = {
  id: string;
  email: string;
  displayName?: string | null;
  role: string;
  tenantId?: string | null;
  isPlatformAdmin?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  tenant: Tenant | null;
  subscription: TenantSubscription | null;
  role: string | null;
  permissions: string[];
  loading: boolean;
  clubSettings: {
    name: string;
    clubType?: string;
    progressionConfig?: import("@shared/clubTypes").ProgressionConfig;
    memberFieldConfig?: import("@shared/clubTypes").MemberFieldConfig;
    moduleConfig?: import("@shared/clubTypes").ModuleConfig;
    logoUrl: string;
    logoUrlLight?: string;
    logoUrlDark?: string;
    managerEmail: string;
    whatsappTemplate?: string;
    whatsappTemplates?: WhatsAppTemplate[];
    phone: string;
    location: string;
    receiptType?: "thermal" | "a4";
    receiptLogoThermal?: string;
    receiptA4Design?: string;
    screensaverEnabled?: boolean;
    screensaverTimeout?: number;
    socials: { facebook: string; instagram: string; twitter: string };
  } | null;
  signOutUser: () => void;
  hasPermission: (permission: string) => boolean;
  refreshClubSettings: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ redirectTo: string }>;
  register: (data: {
    clubName: string;
    email: string;
    password: string;
    adminName: string;
    phone?: string;
    planSlug?: string;
    clubType?: string;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapClubSettings(data: Record<string, unknown>) {
  const templates = normalizeWhatsAppTemplates(
    data.whatsappTemplates as WhatsAppTemplate[] | undefined,
    data.whatsappTemplate as string | undefined,
  );
  const socials = (data.socials as Record<string, string>) || {};
  return {
    name: (data.name as string) || "Club Manager",
    clubType: (data.clubType as string) || "hybrid",
    progressionConfig: data.progressionConfig as import("@shared/clubTypes").ProgressionConfig | undefined,
    memberFieldConfig: data.memberFieldConfig as import("@shared/clubTypes").MemberFieldConfig | undefined,
    moduleConfig: data.moduleConfig as import("@shared/clubTypes").ModuleConfig | undefined,
    logoUrl: (data.logoUrlDark as string) || (data.logoUrlLight as string) || "/logo_dark_icon.svg",
    logoUrlLight: (data.logoUrlLight as string) || "",
    logoUrlDark: (data.logoUrlDark as string) || "",
    managerEmail: (data.managerEmail as string) || "",
    whatsappTemplate: (data.whatsappTemplate as string) || "",
    whatsappTemplates: templates,
    phone: (data.phone as string) || "",
    location: (data.location as string) || "",
    receiptType: (data.receiptType as "thermal" | "a4") || "thermal",
    receiptLogoThermal: (data.receiptLogoThermal as string) || "",
    receiptA4Design: (data.receiptA4Design as string) || "",
    screensaverEnabled: (data.screensaverEnabled as boolean) ?? false,
    screensaverTimeout: (data.screensaverTimeout as number) ?? 60,
    socials: {
      facebook: socials.facebook || "",
      instagram: socials.instagram || "",
      twitter: socials.twitter || "",
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubSettings, setClubSettings] = useState<AuthContextValue["clubSettings"]>(null);

  const fetchClubSettings = useCallback(async () => {
    try {
      const data = await apiJson<Record<string, unknown>>("/api/settings");
      if (data && Object.keys(data).length > 0) {
        setClubSettings(mapClubSettings(data));
      }
    } catch {
      try {
        const pub = await apiJson<Record<string, unknown>>("/api/settings/public");
        if (pub) setClubSettings(mapClubSettings(pub));
      } catch {
        // no settings yet
      }
    }
  }, []);

  const hydrateSession = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiJson<{
        user: AuthUser;
        tenant?: Tenant;
        subscription?: TenantSubscription;
        permissions?: string[];
      }>("/api/auth/me");
      setUser(data.user);
      setTenant(data.tenant || null);
      setSubscription(data.subscription || null);
      setRole(data.user.role);
      setPermissions(data.permissions || (data.user.role === "admin" ? ["*"] : []));
      if (!data.user.isPlatformAdmin) {
        const subStatus = getTenantSubscriptionStatus(data.tenant || null);
        if (subStatus.active) await fetchClubSettings();
      }
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [fetchClubSettings]);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const login = async (email: string, password: string): Promise<{ redirectTo: string }> => {
    const data = await apiJson<{
      token: string;
      user: AuthUser;
      tenant?: Tenant;
      subscription?: TenantSubscription;
    }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setToken(data.token);
    setUser(data.user);
    setTenant(data.tenant || null);
    setRole(data.user.role);
    if (data.user.isPlatformAdmin) {
      setPermissions(["*"]);
      return { redirectTo: "/" };
    }
    setSubscription(data.subscription || null);
    const me = await apiJson<{ permissions?: string[]; subscription?: TenantSubscription }>("/api/auth/me");
    setPermissions(me.permissions || (data.user.role === "admin" ? ["*"] : []));
    if (me.subscription) setSubscription(me.subscription);
    const subStatus = getTenantSubscriptionStatus(data.tenant || null);
    if (subStatus.active) await fetchClubSettings();
    return { redirectTo: subStatus.active ? "/" : "/billing" };
  };

  const register = async (params: {
    clubName: string;
    email: string;
    password: string;
    adminName: string;
    phone?: string;
    planSlug?: string;
    clubType?: string;
  }) => {
    const data = await apiJson<{
      token: string;
      user: AuthUser;
      tenant: Tenant;
    }>("/api/auth/register", { method: "POST", body: JSON.stringify(params) });
    setToken(data.token);
    setUser(data.user);
    setTenant(data.tenant);
    setRole("admin");
    setPermissions(["*"]);
    await fetchClubSettings();
  };

  const signOutUser = () => {
    clearToken();
    setUser(null);
    setTenant(null);
    setSubscription(null);
    setRole(null);
    setPermissions([]);
    setClubSettings(null);
  };

  const hasPermission = (permission: string) => {
    if (!role) return false;
    if (permissions.includes("*")) return true;
    if (permissions.includes(permission)) return true;
    if (permission.endsWith(".add") || permission.endsWith(".edit") || permission.endsWith(".delete")) {
      const base = permission.split(".")[0];
      if (permissions.includes(`${base}.modify`)) return true;
    }
    return false;
  };

  const value = useMemo(
    () => ({
      user,
      tenant,
      subscription,
      role,
      permissions,
      loading,
      clubSettings,
      signOutUser,
      hasPermission,
      refreshClubSettings: fetchClubSettings,
      login,
      register,
    }),
    [user, tenant, subscription, role, permissions, loading, clubSettings, fetchClubSettings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
