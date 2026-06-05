import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { apiJson } from "@/lib/api";
import type { TenantSubscription, PlatformSubscriptionPlan } from "@shared/schema";
import { CreditCard, Calendar, Users, Shield, AlertTriangle } from "lucide-react";
export default function Billing() {
  const { tenant, subscription } = useAuth();

  const { data: plans = [] } = useQuery<PlatformSubscriptionPlan[]>({
    queryKey: ["/api/plans"],
    queryFn: () => apiJson("/api/plans"),
  });

  const { data: currentSub } = useQuery<TenantSubscription>({
    queryKey: ["/api/tenant/subscription"],
    queryFn: () => apiJson("/api/tenant/subscription"),
  });

  const sub = currentSub || subscription;
  const isTrial = tenant?.status === "trial";
  const isExpired = isTrial && tenant?.trialEndsAt && new Date(tenant.trialEndsAt) < new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground">Manage your platform subscription</p>
      </div>

      {isExpired && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-center gap-4 text-destructive">
            <AlertTriangle className="h-8 w-8" />
            <div>
              <p className="font-semibold">Your trial has expired</p>
              <p className="text-sm">Please upgrade to continue using the platform.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Current Plan
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
              <p className="text-3xl font-bold">${sub.priceMonthly}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {isTrial && tenant?.trialEndsAt
                  ? `Trial ends ${new Date(tenant.trialEndsAt).toLocaleDateString()}`
                  : sub?.currentPeriodEnd
                    ? `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                    : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Up to {sub?.maxMembers || 100} members</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>{sub?.maxUsers || 3} staff users</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={sub?.planName === plan.name ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold mb-4">${plan.priceMonthly}<span className="text-sm font-normal">/mo</span></p>
                <ul className="text-sm space-y-1 text-muted-foreground mb-4">
                  <li>{plan.maxMembers} members</li>
                  <li>{plan.maxUsers} users</li>
                </ul>
                <Button className="w-full" variant={sub?.planName === plan.name ? "secondary" : "default"} disabled>
                  {sub?.planName === plan.name ? "Current Plan" : "Contact Admin to Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Payment integration coming soon. Contact platform admin to change your plan.
        </p>
      </div>
    </div>
  );
}
