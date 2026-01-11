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
  UserCog,
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
    title: "لوحة التحكم",
    titleEn: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
];

export function AppSidebar() {
  const { role, user, signOutUser, hasPermission, clubSettings } = useAuth();
  const [location, setLocation] = useLocation();

  const financeItems = [
    {
      title: "الاشتراكات",
      titleEn: "Subscriptions",
      url: "/subscriptions",
      icon: CreditCard,
      permission: PERMISSIONS.SUBSCRIPTIONS_VIEW
    },
    {
      title: "المتجر",
      titleEn: "Store",
      url: "/store",
      icon: Package,
      permission: PERMISSIONS.STORE_VIEW
    },
    {
      title: "المبيعات",
      titleEn: "Sales",
      url: "/sales",
      icon: ShoppingCart,
      permission: PERMISSIONS.SALES_VIEW
    },
    {
      title: "الحسابات",
      titleEn: "Finance",
      url: "/finance",
      icon: BarChart3,
      permission: PERMISSIONS.FINANCE_VIEW
    },
  ];

  const systemItems = [
    {
      title: "المستخدمين",
      titleEn: "Users",
      url: "/users",
      icon: UserCog,
      permission: PERMISSIONS.USERS_VIEW
    },
    {
      title: "السجلات",
      titleEn: "Logs",
      url: "/logs",
      icon: ScrollText,
      permission: PERMISSIONS.LOGS_VIEW
    },
  ];

  const memberItems = [
    {
      title: "الأعضاء",
      titleEn: "Members",
      url: "/members",
      icon: Users,
      permission: PERMISSIONS.MEMBERS_VIEW
    },
    {
      title: "الحضور",
      titleEn: "Attendance",
      url: "/attendance",
      icon: Calendar,
      permission: PERMISSIONS.ATTENDANCE_VIEW
    },
    {
      title: "الأحزمة",
      titleEn: "Belts",
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
    <Sidebar side="right">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex-shrink-0 ${role === 'admin' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={() => {
              if (role === 'admin') {
                setLocation("/system-settings");
              }
            }}
          >
            <img src={clubSettings?.logoUrl || "/logo_dark_icon.svg"} alt="Club Logo" className="w-10 h-10 rounded-full object-contain" />
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-sidebar-foreground truncate" dir="ltr">
              {user?.displayName || user?.email?.split('@')[0] || "User"}
            </div>
            <div className="text-xs text-muted-foreground truncate" dir="ltr">
              {clubSettings?.name || "Club Manager"}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            لوحة التحكم
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            العضوية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMemberItems.map((item) => (
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
