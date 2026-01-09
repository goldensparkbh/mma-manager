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
    title: "إدارة الأعضاء",
    titleEn: "Members",
    url: "/members",
    icon: Users,
  },
  {
    title: "الحضور والانصراف",
    titleEn: "Attendance",
    url: "/attendance",
    icon: Calendar,
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
    title: "المنتجات والمتجر",
    titleEn: "Store",
    url: "/store",
    icon: Package,
  },
  {
    title: "سلة المبيعات",
    titleEn: "Sales",
    url: "/sales",
    icon: ShoppingCart,
  },
  {
    title: "التقارير المالية",
    titleEn: "Finance",
    url: "/finance",
    icon: BarChart3,
  },
];

const systemItems = [
  {
    title: "سجل العمليات",
    titleEn: "Logs",
    url: "/logs",
    icon: ScrollText,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar side="right">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
            C
          </div>
          <div>
            <div className="font-semibold text-sidebar-foreground">نظام النادي</div>
            <div className="text-xs text-muted-foreground">إدارة عضويات · مالية · حضور</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            الرئيسية
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
            الأعضاء
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
            المالية والمتجر
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financeItems.map((item) => (
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
            النظام
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
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
        <div className="text-xs text-muted-foreground">
          <div>مستخدم: مدير النظام</div>
          <div>العملة: دينار بحريني (د.ب)</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
