import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { getTenantSubscriptionStatus } from "@/lib/tenantSubscription";
import type { TenantSubscription } from "@shared/schema";
import { CreditCard, Calendar, Users, Shield, AlertTriangle, Loader2 } from "lucide-react";

export default function Billing() {
  const { tenant, subscription, subscriptionBlockReason } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [paying, setPaying] = useState<"monthly" | "yearly" | null>(null);
  const { active, reason } = getTenantSubscriptionStatus(tenant, subscription, subscriptionBlockReason);

  const { data: paymentConfig } = useQuery<{ tapEnabled: boolean; currency: string; trialDaysRemaining?: number | null }>({
    queryKey: ["/api/tenant/payments/config"],
    queryFn: () => apiJson("/api/tenant/payments/config"),
    enabled: !!tenant,
  });

  const { data: currentSub, refetch } = useQuery<TenantSubscription>({
    queryKey: ["/api/tenant/subscription"],
    queryFn: () => apiJson("/api/tenant/subscription"),
    enabled: !!tenant,
  });

  const sub = currentSub || subscription;
  const isTrial = tenant?.status === "trial";
  const needsPayment = !active || isTrial;

  const alertKey =
    reason === "trial_expired"
      ? "trialExpired"
      : reason === "subscription_expired"
        ? "subscriptionExpired"
        : reason === "subscription_cancelled"
          ? "cancelled"
          : reason === "subscription_suspended"
            ? "suspended"
            : null;

  const startCheckout = async (billingCycle: "monthly" | "yearly") => {
    if (!paymentConfig?.tapEnabled) {
      toast({ variant: "destructive", title: t("common.error"), description: t("billing.tapNotConfigured") });
      return;
    }
    setPaying(billingCycle);
    try {
      const result = await apiJson<{ url: string }>("/api/tenant/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ billingCycle }),
      });
      window.location.href = result.url;
    } catch (err) {
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message });
      setPaying(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("billing.title")}</h1>
        <p className="text-muted-foreground">{t("billing.subtitle")}</p>
      </div>

      {isTrial && paymentConfig?.trialDaysRemaining != null && paymentConfig.trialDaysRemaining > 0 && paymentConfig.trialDaysRemaining <= 3 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6 flex items-center gap-4 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-8 w-8 shrink-0" />
            <div>
              <p className="font-semibold">
                {paymentConfig.trialDaysRemaining <= 1
                  ? t("billing.trialReminder1d")
                  : t("billing.trialReminder3d").replace("{days}", String(paymentConfig.trialDaysRemaining))}
              </p>
              <p className="text-sm opacity-90">{t("billing.trialReminderDesc")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!active && alertKey && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-center gap-4 text-destructive">
            <AlertTriangle className="h-8 w-8 shrink-0" />
            <div>
              <p className="font-semibold">{t(`billing.alerts.${alertKey}`)}</p>
              <p className="text-sm">{t(`billing.alerts.${alertKey}Desc`)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> {t("billing.currentPlan")}
          </CardTitle>
          <CardDescription>{t("billing.lockedPlanNote")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{sub?.planName || "Starter"}</p>
              <Badge variant={isTrial ? "secondary" : "default"} className="mt-1">
                {tenant?.status || sub?.status}
              </Badge>
            </div>
            {sub?.priceMonthly != null && (
              <p className="text-3xl font-bold">
                ${sub.priceMonthly}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {isTrial && tenant?.trialEndsAt
                  ? t("billing.trialEnds").replace("{date}", new Date(tenant.trialEndsAt).toLocaleDateString())
                  : sub?.currentPeriodEnd
                    ? t("billing.renews").replace("{date}", new Date(sub.currentPeriodEnd).toLocaleDateString())
                    : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{t("billing.membersLimit").replace("{count}", String(sub?.maxMembers || 100))}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>{t("billing.staffLimit").replace("{count}", String(sub?.maxUsers || 3))}</span>
            </div>
          </div>

          {needsPayment && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <p className="text-sm font-medium">{t("billing.payToActivate")}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1"
                  disabled={!!paying}
                  onClick={() => startCheckout("monthly")}
                >
                  {paying === "monthly" ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                  {t("billing.payMonthly").replace("{amount}", String(sub?.priceMonthly ?? 0))}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!!paying}
                  onClick={() => startCheckout("yearly")}
                >
                  {paying === "yearly" ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                  {t("billing.payYearly").replace("{amount}", String(sub?.priceYearly ?? 0))}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("billing.tapSecureNote")}</p>
            </div>
          )}

          {active && !isTrial && (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("billing.refreshStatus")}
            </Button>
          )}
        </CardContent>
      </Card>

      {!paymentConfig?.tapEnabled && needsPayment && (
        <p className="text-sm text-center text-muted-foreground">{t("billing.tapNotConfigured")}</p>
      )}
    </div>
  );
}
