import { useLocation, Link } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/context/language-context";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Package,
  BarChart3,
  ShoppingCart,
  ScrollText,
  LogOut,
  Award,
  UserCog,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";

const mainItems = [
  {
    key: "nav.dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
];

export function AppSidebar() {
  const { user, signOutUser, hasPermission, clubSettings } = useAuth();
  const [location, setLocation] = useLocation();
  const { t, dir } = useLanguage();
  const logoUrl = clubSettings?.logoUrlDark || clubSettings?.logoUrlLight || "/logo_dark_icon.svg";

  const financeItems = [
    {
      key: "nav.subscriptions",
      url: "/subscriptions",
      icon: CreditCard,
      permission: PERMISSIONS.SUBSCRIPTIONS_VIEW
    },
    {
      key: "nav.store",
      url: "/store",
      icon: Package,
      permission: PERMISSIONS.STORE_VIEW
    },
    {
      key: "nav.sales",
      url: "/sales",
      icon: ShoppingCart,
      permission: PERMISSIONS.SALES_VIEW
    },
    {
      key: "nav.finance",
      url: "/finance",
      icon: BarChart3,
      permission: PERMISSIONS.FINANCE_VIEW
    },
  ];

  const systemItems = [
    {
      key: "nav.users",
      url: "/users",
      icon: UserCog,
      permission: PERMISSIONS.USERS_VIEW
    },
    {
      key: "nav.logs",
      url: "/logs",
      icon: ScrollText,
      permission: PERMISSIONS.LOGS_VIEW
    },
  ];

  const memberItems = [
    {
      key: "nav.members",
      url: "/members",
      icon: Users,
      permission: PERMISSIONS.MEMBERS_VIEW
    },
    {
      key: "nav.attendance",
      url: "/attendance",
      icon: Calendar,
      permission: PERMISSIONS.ATTENDANCE_VIEW
    },
    {
      key: "nav.belts",
      url: "/belts",
      icon: Award,
      permission: PERMISSIONS.MEMBERS_VIEW // Using members view for now
    },
  ];

  const visibleFinanceItems = financeItems.filter(item => hasPermission(item.permission));
  const visibleSystemItems = systemItems.filter(item => hasPermission(item.permission));
  const visibleMemberItems = memberItems.filter(item => hasPermission(item.permission));

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"}>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <img src={logoUrl} alt={t("common.clubLogoAlt")} className="w-10 h-10 rounded-full object-contain" />
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-white truncate">
              {user?.displayName || user?.email?.split('@')[0] || t("common.user")}
            </div>
            <div className="text-xs text-white/70 truncate">
              {clubSettings?.name || t("common.appName")}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-white/70">
            {t('nav.controlPanel')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                    className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 ltr:text-left rtl:text-right">{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {visibleSystemItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.url.replace("/", "")}`}
                    className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 ltr:text-left rtl:text-right">{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-white/70">
            {t('nav.membership')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMemberItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.url.replace("/", "")}`}
                    className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 ltr:text-left rtl:text-right">{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-white/70">
            {t('nav.financeGroup')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleFinanceItems.map((item) => (
                <SidebarMenuItem key={item.key || item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.url.replace("/", "")}`}
                    tooltip={t(item.key)}
                    className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 ltr:text-left rtl:text-right">{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenu className="mb-4">
          {hasPermission(PERMISSIONS.USERS_MANAGE) && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/system-settings")}
                tooltip={t("nav.settings")}
              >
                <Link href="/system-settings">
                  <Settings className="w-4 h-4" />
                  <span className="font-medium">{t('nav.settings')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOutUser()}
              tooltip={t("nav.logout")}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium text-destructive">{t('nav.logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="text-xs text-white/50">
          <div>{t('footer.rights')}</div>
          <div>{t('footer.version')}</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
