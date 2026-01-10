import { Switch, Route } from "wouter";
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

function AccessDenied() {
  return (
    <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
      لا تملك صلاحية الوصول إلى هذه الصفحة
    </div>
  );
}

function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}) {
  const { role } = useAuth();
  if (!role || !allowedRoles.includes(role)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/members" component={Members} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/store" component={Store} />
      <Route path="/sales" component={Sales} />
      <Route path="/belts" component={Belts} />
      <Route path="/finance">
        <RequireRole allowedRoles={["admin"]}>
          <Finance />
        </RequireRole>
      </Route>
      <Route path="/logs">
        <RequireRole allowedRoles={["admin"]}>
          <Logs />
        </RequireRole>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "4rem",
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        جاري التحميل...
      </div>
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
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs">
                    <span className="text-muted-foreground">اللغة:</span>
                    <span className="font-medium">العربية</span>
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
