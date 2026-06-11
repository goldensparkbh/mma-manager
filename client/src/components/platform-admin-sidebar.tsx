import {
  Building2,
  CreditCard,
  Headphones,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Shield,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { APP_VERSION } from "@/lib/app-version";
import { PlatformBranding } from "@/components/platform-branding";

export type PlatformAdminSection =
  | "overview"
  | "leads"
  | "tenants"
  | "plans"
  | "payments"
  | "support"
  | "admins"
  | "push";

type Props = {
  active: PlatformAdminSection;
  onNavigate: (section: PlatformAdminSection) => void;
};

const NAV: Array<{
  id: PlatformAdminSection;
  labelKey: string;
  icon: typeof LayoutDashboard;
  group: "main" | "billing" | "system";
}> = [
  { id: "overview", labelKey: "platformAdmin.nav.overview", icon: LayoutDashboard, group: "main" },
  { id: "leads", labelKey: "platformAdmin.nav.leads", icon: Megaphone, group: "main" },
  { id: "tenants", labelKey: "platformAdmin.nav.tenants", icon: Building2, group: "main" },
  { id: "plans", labelKey: "platformAdmin.nav.plans", icon: CreditCard, group: "billing" },
  { id: "payments", labelKey: "platformAdmin.nav.payments", icon: CreditCard, group: "billing" },
  { id: "support", labelKey: "platformAdmin.nav.support", icon: Headphones, group: "system" },
  { id: "push", labelKey: "platformAdmin.nav.push", icon: Bell, group: "system" },
  { id: "admins", labelKey: "platformAdmin.nav.admins", icon: ShieldCheck, group: "system" },
];

export function PlatformAdminSidebar({ active, onNavigate }: Props) {
  const { user, signOutUser } = useAuth();
  const { t, dir } = useLanguage();

  const groups = [
    { key: "main", label: t("platformAdmin.nav.groupPlatform") },
    { key: "billing", label: t("platformAdmin.nav.groupBilling") },
    { key: "system", label: t("platformAdmin.nav.groupSystem") },
  ] as const;

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"}>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate text-sm">
                {t("platformAdmin.title")}
              </p>
              <p className="text-xs text-white/60 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOutUser()}
            className="text-white/50 hover:text-destructive hover:bg-destructive/10 shrink-0"
            title={t("nav.logout")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-hide">
        {groups.map((group) => {
          const items = NAV.filter((n) => n.group === group.key);
          return (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel className="text-xs uppercase tracking-wide text-white/70">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={active === item.id}
                        onClick={() => onNavigate(item.id)}
                        className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 ltr:text-left rtl:text-right">{t(item.labelKey)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <PlatformBranding
          titleClassName="text-xs font-semibold text-white/80 text-center"
          subtitleClassName="text-[10px] text-white/40 text-center"
          centered
        />
        <p className="text-[10px] text-white/25 text-center mt-2">
          {t("footer.version").replace("{version}", APP_VERSION.number)}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

export const SECTION_META: Record<
  PlatformAdminSection,
  { titleKey: string; descriptionKey: string }
> = {
  overview: { titleKey: "platformAdmin.overview.title", descriptionKey: "platformAdmin.overview.description" },
  leads: { titleKey: "platformAdmin.leads.title", descriptionKey: "platformAdmin.leads.description" },
  tenants: { titleKey: "platformAdmin.tenants.title", descriptionKey: "platformAdmin.tenants.description" },
  plans: { titleKey: "platformAdmin.plans.title", descriptionKey: "platformAdmin.plans.description" },
  payments: { titleKey: "platformAdmin.payments.title", descriptionKey: "platformAdmin.payments.description" },
  support: { titleKey: "platformAdmin.support.title", descriptionKey: "platformAdmin.support.description" },
  admins: { titleKey: "platformAdmin.admins.title", descriptionKey: "platformAdmin.admins.description" },
  push: { titleKey: "platformAdmin.push.title", descriptionKey: "platformAdmin.push.description" },
};
