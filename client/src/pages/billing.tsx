import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { getTenantSubscriptionStatus } from "@/lib/tenantSubscription";
import type { TenantSubscription, PlatformSubscriptionPlan } from "@shared/schema";
import { CreditCard, Calendar, Users, Shield, AlertTriangle } from "lucide-react";

export default function Billing() {
  const { tenant, subscription } = useAuth();
  const { t } = useLanguage();
  const { active, reason } = getTenantSubscriptionStatus(tenant);

  const { data: plans = [] } = useQuery<PlatformSubscriptionPlan[]>({
    queryKey: ["/api/plans"],
    queryFn: () => apiJson("/api/plans"),
  });

  const { data: currentSub } = useQuery<TenantSubscription>({
    queryKey: ["/api/tenant/subscription"],
    queryFn: () => apiJson("/api/tenant/subscription"),
    enabled: !!tenant,
  });

  const sub = currentSub || subscription;
  const isTrial = tenant?.status === "trial";

  const alertKey =
    reason === "trial_expired"
      ? "trialExpired"
      : reason === "subscription_cancelled"
        ? "cancelled"
        : reason === "subscription_suspended"
          ? "suspended"
          : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("billing.title")}</h1>
        <p className="text-muted-foreground">{t("billing.subtitle")}</p>
      </div>

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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{sub?.planName || "Starter"}</p>
              <Badge variant={isTrial ? "secondary" : "default"} className="mt-1">
                {tenant?.status || sub?.status}
              </Badge>
            </div>
            {sub?.priceMonthly && (
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
                  ? t("billing.trialEnds").replace(
                      "{date}",
                      new Date(tenant.trialEndsAt).toLocaleDateString(),
                    )
                  : sub?.currentPeriodEnd
                    ? t("billing.renews").replace(
                        "{date}",
                        new Date(sub.currentPeriodEnd).toLocaleDateString(),
                      )
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
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">{t("billing.availablePlans")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={sub?.planName === plan.name ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">
                  ${plan.priceMonthly}
                  <span className="text-sm font-normal">/mo</span>
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground mb-4">
                  <li>{t("billing.membersLimit").replace("{count}", String(plan.maxMembers))}</li>
                  <li>{t("billing.staffLimit").replace("{count}", String(plan.maxUsers))}</li>
                </ul>
                <Button className="w-full" variant={sub?.planName === plan.name ? "secondary" : "default"} disabled>
                  {sub?.planName === plan.name ? t("billing.currentPlanButton") : t("billing.upgradeButton")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">{t("billing.paymentNote")}</p>
      </div>
    </div>
  );
}
