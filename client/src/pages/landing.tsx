import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Globe,
  Layers,
  Receipt,
  Shield,
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { ClubTypeImage } from "@/components/club-type-image";
import { LoginClubShowcase } from "@/components/login-club-showcase";
import type { ClubTypeOption } from "@/components/club-type-picker";
import type { PlatformSubscriptionPlan } from "@shared/schema";
import { cn } from "@/lib/utils";

function getPlanFeatureLabels(features: string[], t: (key: string) => string): string[] {
  if (features.includes("*")) return [t("landing.planFeatures.all")];
  const map: Record<string, string> = {
    members: t("landing.planFeatures.members"),
    attendance: t("landing.planFeatures.attendance"),
    subscriptions: t("landing.planFeatures.subscriptions"),
    store: t("landing.planFeatures.store"),
    finance: t("landing.planFeatures.finance"),
    belts: t("landing.planFeatures.belts"),
  };
  return features.map((f) => map[f] || f);
}

function yearlySavingsPercent(monthly: number, yearly: number): number {
  if (!monthly) return 0;
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

export default function Landing() {
  const { t, language, setLanguage, dir } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const { data: plans = [], isLoading: plansLoading } = useQuery<PlatformSubscriptionPlan[]>({
    queryKey: ["/api/plans"],
    queryFn: () => apiJson("/api/plans"),
  });

  const { data: clubTypes = [], isLoading: typesLoading } = useQuery<ClubTypeOption[]>({
    queryKey: ["/api/club-types"],
    queryFn: () => apiJson("/api/club-types"),
  });

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [plans],
  );

  const popularSlug = "professional";

  const features = [
    { icon: Users, key: "members" as const },
    { icon: ClipboardCheck, key: "attendance" as const },
    { icon: CreditCard, key: "subscriptions" as const },
    { icon: Award, key: "belts" as const },
    { icon: ShoppingBag, key: "store" as const },
    { icon: BarChart3, key: "finance" as const },
    { icon: Shield, key: "users" as const },
    { icon: Settings, key: "settings" as const },
  ];

  const steps = [
    { num: 1, key: "step1" as const },
    { num: 2, key: "step2" as const },
    { num: 3, key: "step3" as const },
  ];

  const faqs = [
    { q: "q1", a: "a1" },
    { q: "q2", a: "a2" },
    { q: "q3", a: "a3" },
    { q: "q4", a: "a4" },
  ];

  const differentiators = [
    { icon: Layers, key: "multiTenant" as const },
    { icon: Globe, key: "rtl" as const },
    { icon: Receipt, key: "receipts" as const },
    { icon: Shield, key: "security" as const },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => scrollTo("hero")}
            className="flex items-center gap-2 font-bold text-lg"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <span className="hidden sm:inline">{t("common.appName")}</span>
          </button>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <button type="button" onClick={() => scrollTo("features")} className="text-muted-foreground hover:text-foreground transition-colors">
              {t("landing.nav.features")}
            </button>
            <button type="button" onClick={() => scrollTo("club-types")} className="text-muted-foreground hover:text-foreground transition-colors">
              {t("landing.nav.clubTypes")}
            </button>
            <button type="button" onClick={() => scrollTo("pricing")} className="text-muted-foreground hover:text-foreground transition-colors">
              {t("landing.nav.pricing")}
            </button>
            <button type="button" onClick={() => scrollTo("faq")} className="text-muted-foreground hover:text-foreground transition-colors">
              {t("landing.nav.faq")}
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center rounded-lg border p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLanguage("ar")}
                className={cn("rounded-md px-2 py-1 transition-colors", language === "ar" && "bg-primary text-primary-foreground")}
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={cn("rounded-md px-2 py-1 transition-colors", language === "en" && "bg-primary text-primary-foreground")}
              >
                EN
              </button>
            </div>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                {t("landing.nav.login")}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">{t("landing.nav.register")}</Button>
            </Link>
          </div>
        </div>
      </header>

      <section id="hero" className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 hidden lg:block opacity-40" aria-hidden>
          <LoginClubShowcase />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/80 via-background/92 to-background lg:from-background/70 lg:via-background/85" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {t("landing.hero.badge")}
            </Badge>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {t("landing.hero.title")}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl leading-relaxed">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="h-12 min-w-[200px] text-base">
                  {t("landing.hero.ctaPrimary")}
                  {dir === "rtl" ? <ChevronRight className="ms-2 h-4 w-4 rotate-180" /> : <ChevronRight className="ms-2 h-4 w-4" />}
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-12 min-w-[160px] text-base">
                  {t("landing.hero.ctaSecondary")}
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />{t("landing.hero.trial")}</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />{t("landing.hero.noCard")}</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />{t("landing.hero.bilingual")}</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />{t("landing.hero.templates")}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.features.title")}</h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("landing.features.subtitle")}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, key }) => (
              <Card key={key} className="border-border/60 bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t(`landing.features.${key}.title`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {t(`landing.features.${key}.desc`)}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="club-types" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.clubTypes.title")}</h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("landing.clubTypes.subtitle")}</p>
          </div>

          {typesLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {clubTypes.map((type) => {
                const name = language === "ar" ? type.nameAr : type.nameEn;
                return (
                  <div
                    key={type.id}
                    className="group overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      <ClubTypeImage clubTypeId={type.id} alt={name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-sm font-semibold leading-tight">{name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link href="/register">
              <Button size="lg">{t("landing.clubTypes.cta")}</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.howItWorks.title")}</h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("landing.howItWorks.subtitle")}</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map(({ num, key }) => (
              <div key={key} className="relative text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  {num}
                </div>
                <h3 className="text-xl font-bold">{t(`landing.howItWorks.${key}.title`)}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{t(`landing.howItWorks.${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.pricing.title")}</h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("landing.pricing.subtitle")}</p>
          </div>

          <div className="mb-10 flex justify-center">
            <div className="inline-flex rounded-lg border p-1 bg-muted/50">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  billingCycle === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {t("landing.pricing.monthly")}
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  billingCycle === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {t("landing.pricing.yearly")}
              </button>
            </div>
          </div>

          {plansLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {sortedPlans.map((plan) => {
                const isPopular = plan.slug === popularSlug;
                const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
                const savings = yearlySavingsPercent(plan.priceMonthly, plan.priceYearly);
                const featureLabels = getPlanFeatureLabels(plan.features, t);

                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "relative flex flex-col",
                      isPopular && "border-primary shadow-lg ring-1 ring-primary/20",
                    )}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 px-3">
                        {t("landing.pricing.popular")}
                      </Badge>
                    )}
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-black">${price}</span>
                        <span className="text-muted-foreground text-sm ms-1">
                          {billingCycle === "monthly" ? t("landing.pricing.perMonth") : t("landing.pricing.perYear")}
                        </span>
                      </div>
                      {billingCycle === "yearly" && savings > 0 && (
                        <p className="text-xs text-primary font-medium mt-1">
                          {t("landing.pricing.saveYearly").replace("{percent}", String(savings))}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-6">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          {t("landing.pricing.members").replace("{count}", String(plan.maxMembers))}
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          {t("landing.pricing.staff").replace("{count}", String(plan.maxUsers))}
                        </li>
                        {featureLabels.map((label) => (
                          <li key={label} className="flex items-center gap-2">
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                            {label}
                          </li>
                        ))}
                      </ul>
                      <Link href="/register" className="mt-auto">
                        <Button className="w-full" variant={isPopular ? "default" : "outline"}>
                          {t("landing.pricing.getStarted")}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">{t("landing.pricing.trialNote")}</p>
        </div>
      </section>

      <section className="py-20 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-14">
            {t("landing.differentiators.title")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {differentiators.map(({ icon: Icon, key }) => (
              <div key={key} className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold">{t(`landing.differentiators.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {t(`landing.differentiators.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-14">
            {t("landing.faq.title")}
          </h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <Card key={q}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{t(`landing.faq.${q}`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`landing.faq.${a}`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.cta.title")}</h2>
          <p className="mt-4 text-primary-foreground/85 text-lg">{t("landing.cta.subtitle")}</p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="mt-8 h-12 min-w-[220px] text-base font-semibold">
              {t("landing.cta.button")}
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-12 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 font-bold">
                <Building2 className="h-5 w-5 text-primary" />
                {t("common.appName")}
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {t("landing.hero.subtitle")}
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">{t("landing.footer.product")}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button type="button" onClick={() => scrollTo("features")} className="hover:text-foreground">{t("landing.nav.features")}</button></li>
                <li><button type="button" onClick={() => scrollTo("pricing")} className="hover:text-foreground">{t("landing.nav.pricing")}</button></li>
                <li><button type="button" onClick={() => scrollTo("faq")} className="hover:text-foreground">{t("landing.nav.faq")}</button></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">{t("landing.footer.account")}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-foreground">{t("landing.nav.register")}</Link></li>
                <li><Link href="/login" className="hover:text-foreground">{t("landing.nav.login")}</Link></li>
              </ul>
              <p className="font-semibold text-sm mt-6 mb-3">{t("landing.footer.language")}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setLanguage("ar")} className={cn("text-sm hover:text-foreground", language === "ar" && "font-bold text-foreground")}>عربي</button>
                <span className="text-muted-foreground">·</span>
                <button type="button" onClick={() => setLanguage("en")} className={cn("text-sm hover:text-foreground", language === "en" && "font-bold text-foreground")}>English</button>
              </div>
            </div>
          </div>
          <p className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
            {t("footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
