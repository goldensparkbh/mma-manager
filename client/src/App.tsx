import { Switch, Route, useLocation } from "wouter";
import { ShieldAlert, Loader2 } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { LanguageProvider, useLanguage } from "@/context/language-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import AttendancePage from "@/pages/attendance";
import SchedulePage from "@/pages/schedule";
import Subscriptions from "@/pages/subscriptions";
import Store from "@/pages/store";
import Sales from "@/pages/sales";
import Finance from "@/pages/finance";
import Expenses from "@/pages/expenses";
import Logs from "@/pages/logs";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Landing from "@/pages/landing";
import Belts from "@/pages/belts";
import Users from "@/pages/users";
import SystemSettings from "@/pages/system-settings";
import Billing from "@/pages/billing";
import PaymentResult from "@/pages/payment-result";
import PlatformAdmin from "@/pages/platform-admin";
import { ScreenSaver } from "@/components/screen-saver";
import { SubscriptionGate } from "@/components/subscription-gate";
import { SupportChatProvider } from "@/context/support-chat-context";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { useEffect } from "react";
import { PERMISSIONS } from "@/lib/permissions";
import PortalApp from "@/pages/portal";
import EmbedWidget from "@/pages/embed";
import AnalyticsPage from "@/pages/analytics";
import CampsPage from "@/pages/camps";
import CheckInPage from "@/pages/checkin";

function AccessDenied() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-4 h-[60vh] items-center justify-center text-muted-foreground">
      <ShieldAlert className="w-16 h-16 text-destructive" />
      <h2 className="text-xl font-bold">{t("common.accessDeniedTitle")}</h2>
      <p>{t("common.accessDeniedMessage")}</p>
    </div>
  );
}

function RequirePermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <AccessDenied />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/members">
        <RequirePermission permission={PERMISSIONS.MEMBERS_VIEW}><Members /></RequirePermission>
      </Route>
      <Route path="/attendance">
        <RequirePermission permission={PERMISSIONS.ATTENDANCE_VIEW}><AttendancePage /></RequirePermission>
      </Route>
      <Route path="/schedule">
        <RequirePermission permission={PERMISSIONS.CLASSES_VIEW}><SchedulePage /></RequirePermission>
      </Route>
      <Route path="/subscriptions">
        <RequirePermission permission={PERMISSIONS.SUBSCRIPTIONS_VIEW}><Subscriptions /></RequirePermission>
      </Route>
      <Route path="/store">
        <RequirePermission permission={PERMISSIONS.STORE_VIEW}><Store /></RequirePermission>
      </Route>
      <Route path="/sales">
        <RequirePermission permission={PERMISSIONS.SALES_VIEW}><Sales /></RequirePermission>
      </Route>
      <Route path="/belts">
        <RequirePermission permission={PERMISSIONS.BELTS_VIEW}><Belts /></RequirePermission>
      </Route>
      <Route path="/analytics">
        <RequirePermission permission={PERMISSIONS.FINANCE_VIEW}><AnalyticsPage /></RequirePermission>
      </Route>
      <Route path="/camps">
        <RequirePermission permission={PERMISSIONS.CLASSES_VIEW}><CampsPage /></RequirePermission>
      </Route>
      <Route path="/finance">
        <RequirePermission permission={PERMISSIONS.FINANCE_VIEW}><Finance /></RequirePermission>
      </Route>
      <Route path="/expenses">
        <RequirePermission permission={PERMISSIONS.FINANCE_VIEW}><Expenses /></RequirePermission>
      </Route>
      <Route path="/users">
        <RequirePermission permission={PERMISSIONS.USERS_VIEW}><Users /></RequirePermission>
      </Route>
      <Route path="/logs">
        <RequirePermission permission={PERMISSIONS.LOGS_VIEW}><Logs /></RequirePermission>
      </Route>
      <Route path="/system-settings">
        <RequirePermission permission={PERMISSIONS.SETTINGS_VIEW}><SystemSettings /></RequirePermission>
      </Route>
      <Route path="/billing" component={Billing} />
      <Route path="/payment/result" component={PaymentResult} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRoutes() {
  const [location] = useLocation();
  if (location === "/") return <Landing />;
  if (location === "/register") return <Register />;
  if (location === "/login") return <Login />;
  return <Landing />;
}

function AppShell() {
  const { user, loading, clubSettings, tenant } = useAuth();
  const { t, language } = useLanguage();
  const [location] = useLocation();
  const style = { "--sidebar-width": "17rem", "--sidebar-width-icon": "4rem" };

  if (location.startsWith("/portal/")) {
    return <PortalApp />;
  }

  if (location.startsWith("/embed/")) {
    return <EmbedWidget />;
  }

  if (location.startsWith("/checkin/")) {
    return <CheckInPage />;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    if (location === "/payment/result") return <PaymentResult />;
    if (location.startsWith("/checkin/")) return <CheckInPage />;
    return <PublicRoutes />;
  }

  if (user.isPlatformAdmin) return <PlatformAdmin />;

  return (
    <SubscriptionGate>
    <SupportChatProvider>
    <ThemeProvider defaultTheme="light" storageKey="club-theme">
      <ScreenSaver />
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <ImpersonationBanner />
              <header className="flex items-center justify-between gap-4 p-3 border-b bg-card">
                <div className="flex items-center gap-3">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="hidden sm:block">
                    <p className="text-xs text-muted-foreground">{t("common.todayDate")}</p>
                    <p className="text-sm font-medium">
                      {new Intl.DateTimeFormat(language === "ar" ? "ar-BH" : "en-US", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                      }).format(new Date())}
                    </p>
                  </div>
                  <div className="sm:hidden font-bold truncate max-w-[150px]">
                    {clubSettings?.name || tenant?.name || t("common.appName")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tenant?.status === "trial" && tenant.trialEndsAt && (
                    <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {(() => {
                        const days = Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86400000);
                        return days > 0 ? t("billing.trialDaysLeft").replace("{days}", String(days)) : t("billing.trialEnded");
                      })()}
                    </span>
                  )}
                  <div className="hidden xs:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs font-mono">
                    <span className="text-muted-foreground uppercase opacity-70">{t("common.currency")}</span>
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
      </TooltipProvider>
      <Toaster />
    </ThemeProvider>
    </SupportChatProvider>
    </SubscriptionGate>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}
