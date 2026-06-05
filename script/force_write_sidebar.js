const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../client/src/components/app-sidebar.tsx');

const content = `import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Wallet,
  FileText,
  LogOut
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, role, signOutUser } = useAuth();

  const items = [
    { title: "Dashboard", titleAr: "لوحة التحكم", url: "/", icon: LayoutDashboard },
    { title: "Members", titleAr: "الأعضاء", url: "/members", icon: Users },
    { title: "Attendance", titleAr: "الحضور", url: "/attendance", icon: CalendarCheck },
    { title: "Subscriptions", titleAr: "الاشتراكات", url: "/subscriptions", icon: CreditCard },
    { title: "Store", titleAr: "المتجر", url: "/store", icon: ShoppingBag },
    { title: "Sales", titleAr: "المبيعات", url: "/sales", icon: TrendingUp },
  ];

  const adminItems = [
    { title: "Finance", titleAr: "المالية", url: "/finance", icon: Wallet },
    { title: "Logs", titleAr: "السجلات", url: "/logs", icon: FileText },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r pt-4" variant="sidebar">
      <SidebarHeader>
        <div className="flex items-center justify-center py-4">
             <img src="/logo_s.svg" alt="App Logo" className="w-10 h-10 rounded-full object-contain" />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>القائمة الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} tooltip={item.titleAr}>
                    <Link href={item.url}>
                       <item.icon className="h-5 w-5" />
                       <span className="font-medium">{item.titleAr}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "admin" && (
            <SidebarGroup>
              <SidebarGroupLabel>الإدارة</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url} tooltip={item.titleAr}>
                         <Link href={item.url}>
                           <item.icon className="h-5 w-5" />
                           <span className="font-medium">{item.titleAr}</span>
                         </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4 px-2 group-data-[collapsible=icon]:hidden">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.photoURL || ""} />
              <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate text-left" dir="ltr">{user?.displayName || user?.email?.split('@')[0] || "المستخدم"}</span>
              <span className="text-xs text-muted-foreground truncate text-left" dir="ltr">{user?.email}</span>
            </div>
          </div>
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => signOutUser()} tooltip="تسجيل الخروج" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                 <LogOut className="h-5 w-5" />
                 <span className="font-medium">تسجيل الخروج</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log("Sidebar overwritten with UTF-8 content.");
