import { useLocation, Link } from "wouter";
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

const mainItems = [
  {
    title: "لوحة التحكم",
    titleEn: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
];

const memberItems = [
  {
    title: "الأعضاء",
    titleEn: "Members",
    url: "/members",
    icon: Users,
  },
  {
    title: "الحضور",
    titleEn: "Attendance",
    url: "/attendance",
    icon: Calendar,
  },
  {
    title: "الأحزمة",
    titleEn: "Belts",
    url: "/belts",
    icon: Award,
  },
];

const financeItems = [
  {
    title: "الاشتراكات",
    titleEn: "Subscriptions",
    url: "/subscriptions",
    icon: CreditCard,
  },
  {
    title: "المتجر",
    titleEn: "Store",
    url: "/store",
    icon: Package,
  },
  {
    title: "المبيعات",
    titleEn: "Sales",
    url: "/sales",
    icon: ShoppingCart,
  },
  {
    title: "الحسابات",
    titleEn: "Finance",
    url: "/finance",
    icon: BarChart3,
  },
];

const systemItems = [
  {
    title: "السجلات",
    titleEn: "Logs",
    url: "/logs",
    icon: ScrollText,
  },
];

export function AppSidebar() {
  const { role, user, signOutUser } = useAuth();
  const [location] = useLocation();
  const isAdmin = role === "admin";
  const visibleFinanceItems = isAdmin
    ? financeItems
    : financeItems.filter((item) => item.url !== "/finance");
  const visibleSystemItems = isAdmin ? systemItems : [];

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar side="right">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <img src="/logo_dark_icon.svg" alt="Club Logo" className="w-10 h-10 rounded-full object-contain" />
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-sidebar-foreground truncate" dir="ltr">
              {user?.displayName || user?.email?.split('@')[0] || "User"}
            </div>
            <div className="text-xs text-muted-foreground truncate" dir="ltr">
              Club Manager
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            المسؤول
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 text-right">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.titleEn}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            العضوية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {memberItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.url.replace("/", "")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 text-right">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.titleEn}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            المالية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleFinanceItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.url.replace("/", "")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 text-right">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.titleEn}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleSystemItems.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground">
              النظام?
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleSystemItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      data-testid={`nav-${item.url.replace("/", "")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1 text-right">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.titleEn}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenu className="mb-4">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOutUser()}
              tooltip="تسجيل الخروج"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="text-xs text-muted-foreground">
          <div>جميع الحقوق محفوظة © 2026</div>
          <div>نظام إدارة النوادي (النسخة 1.2)</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
