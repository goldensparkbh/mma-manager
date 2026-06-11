import { Link } from "wouter";
import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { FEATURE_LABELS, FEATURE_UPGRADE_PLAN, type PlanFeature } from "@/lib/planFeatures";

export function UpgradeBanner({ feature, compact }: { feature: PlanFeature; compact?: boolean }) {
  const { hasPlanFeature } = useAuth();
  const { t, language } = useLanguage();
  if (hasPlanFeature(feature)) return null;

  const label = FEATURE_LABELS[feature]?.[language === "ar" ? "ar" : "en"] ?? feature;
  const plan = FEATURE_UPGRADE_PLAN[feature] ?? "professional";

  if (compact) {
    return (
      <Link href="/billing">
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary cursor-pointer hover:bg-primary/10 transition-colors">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{t("plan.upgradeCompact").replace("{feature}", label).replace("{plan}", plan)}</span>
        </div>
      </Link>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold">{t("plan.upgradeTitle").replace("{feature}", label)}</h3>
          <p className="text-sm text-muted-foreground">{t("plan.upgradeDescription")}</p>
        </div>
        <Button asChild>
          <Link href="/billing">{t("plan.viewPlans")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function RequirePlanFeature({ feature, children }: { feature: PlanFeature; children: React.ReactNode }) {
  const { hasPlanFeature } = useAuth();
  const { t, language } = useLanguage();

  if (hasPlanFeature(feature)) return <>{children}</>;

  const label = FEATURE_LABELS[feature]?.[language === "ar" ? "ar" : "en"] ?? feature;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="rounded-full bg-muted p-4">
          <Lock className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">{t("plan.lockedTitle").replace("{feature}", label)}</h2>
        <p className="text-muted-foreground max-w-md">{t("plan.lockedDescription")}</p>
      </div>
      <UpgradeBanner feature={feature} />
    </div>
  );
}
