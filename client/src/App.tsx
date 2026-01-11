import { Switch, Route } from "wouter";
import { ShieldAlert } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/context/auth-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import AttendancePage from "@/pages/attendance";
import Subscriptions from "@/pages/subscriptions";
import Store from "@/pages/store";
import Sales from "@/pages/sales";
import Finance from "@/pages/finance";
import Logs from "@/pages/logs";
import Login from "@/pages/login";
import Belts from "@/pages/belts";
import Users from "@/pages/users";
import SystemSettings from "@/pages/system-settings";
import SetupWizard from "@/pages/setup-wizard";

import { useLocation } from "wouter";
import { useEffect } from "react";
import { PERMISSIONS } from "@/lib/permissions";

function AccessDenied() {
  return (
    <div className="flex flex-col gap-4 h-[60vh] items-center justify-center text-muted-foreground">
      <ShieldAlert className="w-16 h-16 text-destructive" />
      <h2 className="text-xl font-bold">لا تملك صلاحية الوصول</h2>
      <p>ليس لديك الصلاحية المطلوبة لعرض هذه الصفحة</p>
    </div>
  );
}

function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />

      <Route path="/members">
        <RequirePermission permission={PERMISSIONS.MEMBERS_VIEW}>
          <Members />
        </RequirePermission>
      </Route>

      <Route path="/attendance">
        <RequirePermission permission={PERMISSIONS.ATTENDANCE_VIEW}>
          <AttendancePage />
        </RequirePermission>
      </Route>

      <Route path="/subscriptions">
        <RequirePermission permission={PERMISSIONS.SUBSCRIPTIONS_VIEW}>
          <Subscriptions />
        </RequirePermission>
      </Route>

      <Route path="/store">
        <RequirePermission permission={PERMISSIONS.STORE_VIEW}>
          <Store />
        </RequirePermission>
      </Route>

      <Route path="/sales">
        <RequirePermission permission={PERMISSIONS.SALES_VIEW}>
          <Sales />
        </RequirePermission>
      </Route>

      <Route path="/belts">
        <RequirePermission permission={PERMISSIONS.MEMBERS_VIEW}>
          <Belts />
        </RequirePermission>
      </Route>

      <Route path="/finance">
        <RequirePermission permission={PERMISSIONS.FINANCE_VIEW}>
          <Finance />
        </RequirePermission>
      </Route>

      <Route path="/users">
        <RequirePermission permission={PERMISSIONS.USERS_VIEW}>
          <Users />
        </RequirePermission>
      </Route>

      <Route path="/logs">
        <RequirePermission permission={PERMISSIONS.LOGS_VIEW}>
          <Logs />
        </RequirePermission>
      </Route>

      <Route path="/system-settings">
        <RequirePermission permission={PERMISSIONS.USERS_MANAGE}>
          <SystemSettings />
        </RequirePermission>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { user, loading, clubSettings, setupRequired } = useAuth();
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "4rem",
  };

  const [location] = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  if (setupRequired) {
    return (
      <>
        <SetupWizard />
        <Toaster />
      </>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="club-theme">
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between gap-4 p-3 border-b bg-card">
                <div className="flex items-center gap-3">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="hidden sm:block">
                    <p className="text-xs text-muted-foreground">تاريخ اليوم</p>
                    <p className="text-sm font-medium">
                      {new Intl.DateTimeFormat("ar-BH", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }).format(new Date())}
                    </p>
                  </div>
                  {/* Mobile Club Name */}
                  <div className="sm:hidden font-bold truncate max-w-[150px]">
                    {clubSettings?.name || "Club Manager"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden xs:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs font-mono">
                    <span className="text-muted-foreground uppercase opacity-70">BH</span>
                  </div>
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto p-4 md:p-6">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}
