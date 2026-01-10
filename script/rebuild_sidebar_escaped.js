const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '../client/src/components/app-sidebar.tsx');

// Using Unicode Escapes to survive ASCII transport/saving
const dashboard = "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645";
const members = "\u0627\u0644\u0623\u0639\u0636\u0627\u0621";
const attendance = "\u0627\u0644\u062d\u0636\u0648\u0631";
const subscriptions = "\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a";
const store = "\u0627\u0644\u0645\u062a\u062c\u0631";
const sales = "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a";
const finance = "\u0627\u0644\u0645\u0627\u0644\u064a\u0629";
const logs = "\u0627\u0644\u0633\u062c\u0644\u0627\u062a";
const mainMenu = "\u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629";
const admin = "\u0627\u0644\u0625\u062f\u0627\u0631\u0629";
const logout = "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c";
const userFallback = "\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645";

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
    { title: "Dashboard", titleAr: "${dashboard}", url: "/", icon: LayoutDashboard },
    { title: "Members", titleAr: "${members}", url: "/members", icon: Users },
    { title: "Attendance", titleAr: "${attendance}", url: "/attendance", icon: CalendarCheck },
    { title: "Subscriptions", titleAr: "${subscriptions}", url: "/subscriptions", icon: CreditCard },
    { title: "Store", titleAr: "${store}", url: "/store", icon: ShoppingBag },
    { title: "Sales", titleAr: "${sales}", url: "/sales", icon: TrendingUp },
  ];

  const adminItems = [
    { title: "Finance", titleAr: "${finance}", url: "/finance", icon: Wallet },
    { title: "Logs", titleAr: "${logs}", url: "/logs", icon: FileText },
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
          <SidebarGroupLabel>${mainMenu}</SidebarGroupLabel>
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
              <SidebarGroupLabel>${admin}</SidebarGroupLabel>
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
              <span className="text-sm font-medium truncate text-left" dir="ltr">{user?.displayName || user?.email?.split('@')[0] || "${userFallback}"}</span>
              <span className="text-xs text-muted-foreground truncate text-left" dir="ltr">{user?.email}</span>
            </div>
          </div>
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => signOutUser()} tooltip="${logout}" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                 <LogOut className="h-5 w-5" />
                 <span className="font-medium">${logout}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
`;

try {
    if (fs.existsSync(target)) {
        fs.unlinkSync(target);
    }
    fs.writeFileSync(target, content, 'utf8');
    console.log("Success");
} catch (e) { console.error(e); }
