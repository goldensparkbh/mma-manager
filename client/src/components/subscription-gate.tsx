import { useEffect } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { getTenantSubscriptionStatus, type SubscriptionBlockReason } from "@/lib/tenantSubscription";
import Billing from "@/pages/billing";

const REASON_KEYS: Record<SubscriptionBlockReason, string> = {
  subscription_suspended: "billing.gate.suspended",
  subscription_cancelled: "billing.gate.cancelled",
  trial_expired: "billing.gate.trialExpired",
};

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { tenant, signOutUser } = useAuth();
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const { active, reason } = getTenantSubscriptionStatus(tenant);

  useEffect(() => {
    if (!active && location !== "/billing") {
      setLocation("/billing");
    }
  }, [active, location, setLocation]);

  if (active) return <>{children}</>;

  if (location === "/billing") {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <span className="font-semibold">{tenant?.name || t("common.appName")}</span>
          </div>
          <Button variant="outline" size="sm" onClick={signOutUser}>
            <LogOut className="h-4 w-4 me-2" />
            {t("nav.logout")}
          </Button>
        </header>
        <main className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6 flex items-start gap-4">
              <AlertTriangle className="h-10 w-10 text-destructive shrink-0" />
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-destructive">{t("billing.gate.title")}</h2>
                <p className="text-muted-foreground">
                  {t(reason ? REASON_KEYS[reason] : "billing.gate.suspended")}
                </p>
                <p className="text-sm text-muted-foreground">{t("billing.gate.description")}</p>
              </div>
            </CardContent>
          </Card>
          <Billing />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Loader />
    </div>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
