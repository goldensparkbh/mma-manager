import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/context/language-context";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
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
  BookOpen,
  TrendingDown,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserGuideDialog } from "./user-guide-dialog";
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
import { useClubConfig } from "@/lib/clubConfig";
import { PERMISSIONS } from "@/lib/permissions";
import { APP_VERSION } from "@/lib/app-version";
import { useSupportChat } from "@/context/support-chat-context";

const mainItems = [
  {
    key: "nav.dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
];

export function AppSidebar() {
  const { user, signOutUser, clubSettings, role, hasPermission } = useAuth();
  const { showBeltsNav, showStore, progressionLabel } = useClubConfig();
  const [location, setLocation] = useLocation();
  const { t, dir } = useLanguage();
  const [guideOpen, setGuideOpen] = useState(false);
  const { openChat } = useSupportChat();
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
      key: "nav.expenses",
      url: "/expenses",
      icon: TrendingDown,
      permission: PERMISSIONS.FINANCE_VIEW
    },
    {
      key: "nav.analytics",
      url: "/analytics",
      icon: BarChart3,
      permission: PERMISSIONS.FINANCE_VIEW
    },
    {
      key: "nav.finance",
      url: "/finance",
      icon: BarChart3,
      permission: PERMISSIONS.FINANCE_VIEW
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
      key: "nav.schedule",
      url: "/schedule",
      icon: CalendarDays,
      permission: PERMISSIONS.CLASSES_VIEW
    },
    {
      key: "nav.camps",
      url: "/camps",
      icon: CalendarDays,
      permission: PERMISSIONS.CLASSES_VIEW
    },
    {
      key: "nav.belts",
      url: "/belts",
      icon: Award,
      permission: PERMISSIONS.BELTS_VIEW
    },
  ];

  const systemItems: typeof memberItems = [];

  const visibleFinanceItems = financeItems
    .filter(item => hasPermission(item.permission))
    .filter(item => item.url !== "/store" || showStore);
  const visibleSystemItems = systemItems.filter(item => hasPermission(item.permission));
  const visibleMemberItems = memberItems
    .filter(item => hasPermission(item.permission))
    .filter(item => item.url !== "/belts" || showBeltsNav);

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"}>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0">
              {(clubSettings?.logoUrlDark || clubSettings?.logoUrlLight) ? (
                <img
                  src={clubSettings?.logoUrlDark || clubSettings?.logoUrlLight}
                  alt={clubSettings?.name || t("common.clubLogoAlt")}
                  className="w-10 h-10 rounded-full object-contain"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {clubSettings?.name?.[0] || "C"}
                </div>
              )}
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

          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOutUser()}
            className="text-white/50 hover:text-destructive hover:bg-destructive/10 shrink-0"
            title={t("nav.logout")}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-hide">
        <SidebarGroup>
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
                      <span className="flex-1 ltr:text-left rtl:text-right">
                        {item.url === "/belts" ? progressionLabel : t(item.key)}
                      </span>
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-white/70">
            {t('nav.system')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasPermission(PERMISSIONS.USERS_VIEW) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/users")}
                    tooltip={t("nav.users")}
                    className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                  >
                    <Link href="/users">
                      <UserCog className="w-4 h-4" />
                      <span className="flex-1 ltr:text-left rtl:text-right">{t('nav.users')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {hasPermission(PERMISSIONS.SETTINGS_VIEW) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/system-settings")}
                    tooltip={t("nav.settings")}
                    className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                  >
                    <Link href="/system-settings">
                      <Settings className="w-4 h-4" />
                      <span className="flex-1 ltr:text-left rtl:text-right">{t('nav.settings')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/billing")}
                  tooltip="Subscription"
                  className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                >
                  <Link href="/billing">
                    <CreditCard className="w-4 h-4" />
                    <span className="flex-1 ltr:text-left rtl:text-right">Subscription</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={openChat}
                  tooltip={t("nav.support")}
                  className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="flex-1 ltr:text-left rtl:text-right">{t("nav.support")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setGuideOpen(true)}
                  tooltip={t("nav.guide")}
                  className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="flex-1 ltr:text-left rtl:text-right">{t('nav.guide')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {hasPermission(PERMISSIONS.LOGS_VIEW) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/logs")}
                    tooltip={t("nav.logs")}
                    className="text-white hover:text-white hover:bg-white/10 data-[active=true]:bg-white/20 data-[active=true]:text-white"
                  >
                    <Link href="/logs">
                      <ScrollText className="w-4 h-4" />
                      <span className="flex-1 ltr:text-left rtl:text-right">{t('nav.logs')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar">
        <div className="text-[10px] text-white/30 text-center space-y-1">
          <div>{t('footer.rights')}</div>
          <div className="text-white/40">{t("common.appName")}</div>
          <div className="text-white/25 leading-snug">{t("common.appSubtitle")}</div>
          <div>{t('footer.version').replace("{version}", APP_VERSION.number)}</div>
        </div>
        <UserGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
      </SidebarFooter>
    </Sidebar>
  );
}
