import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import AttendancePage from "@/pages/attendance";
import Subscriptions from "@/pages/subscriptions";
import Store from "@/pages/store";
import Sales from "@/pages/sales";
import Finance from "@/pages/finance";
import Logs from "@/pages/logs";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/members" component={Members} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/store" component={Store} />
      <Route path="/sales" component={Sales} />
      <Route path="/finance" component={Finance} />
      <Route path="/logs" component={Logs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

export default App;
