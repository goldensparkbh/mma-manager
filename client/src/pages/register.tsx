import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { ClubTypePicker, type ClubTypeOption } from "@/components/club-type-picker";
import { ClubTypeImage } from "@/components/club-type-image";
import type { PlatformSubscriptionPlan } from "@shared/schema";
import { Building2, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function Register() {
  const { toast } = useToast();
  const { register } = useAuth();
  const { t, language, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clubName: "",
    adminName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    planSlug: "starter",
    clubType: "hybrid",
  });

  const { data: plans = [] } = useQuery<PlatformSubscriptionPlan[]>({
    queryKey: ["/api/plans"],
    queryFn: () => apiJson("/api/plans"),
  });

  const { data: clubTypes = [], isLoading: typesLoading } = useQuery<ClubTypeOption[]>({
    queryKey: ["/api/club-types"],
    queryFn: () => apiJson("/api/club-types"),
  });

  const selectedType = clubTypes.find((c) => c.id === form.clubType);

  const handleSubmit = async () => {
    if (!form.clubName || !form.adminName || !form.email || !form.password) {
      toast({ variant: "destructive", title: t("common.error"), description: t("register.errorRequired") });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ variant: "destructive", title: t("common.error"), description: t("register.errorPasswordMatch") });
      return;
    }
    if (form.password.length < 6) {
      toast({ variant: "destructive", title: t("common.error"), description: t("register.errorPasswordLength") });
      return;
    }

    setLoading(true);
    try {
      await register({
        clubName: form.clubName,
        adminName: form.adminName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        planSlug: form.planSlug,
        clubType: form.clubType,
      });
      toast({ title: t("common.success"), description: t("register.success") });
      setLocation("/");
    } catch (err) {
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <div className="mb-8 text-center sm:text-start">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <div className="text-start">
                <h1 className="text-2xl sm:text-3xl font-bold">{t("register.title")}</h1>
                <p className="text-muted-foreground text-sm sm:text-base">{t("register.step1Subtitle")}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">{t("register.clubTypeHint")}</p>
          </div>

          {typesLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <ClubTypePicker
              clubTypes={clubTypes}
              value={form.clubType}
              onChange={(id) => setForm((f) => ({ ...f, clubType: id }))}
            />
          )}

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6">
            <p className="text-sm text-muted-foreground text-center sm:text-start">
              {t("register.hasAccount")}{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">{t("register.signIn")}</Link>
            </p>
            <Button size="lg" className="w-full sm:w-auto min-w-[200px]" onClick={() => setStep(2)}>
              {t("register.continue")}
              {dir === "rtl" ? <ChevronLeft className="ms-2 h-4 w-4" /> : <ChevronRight className="ms-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-6">
        <Button variant="ghost" className="gap-2 -ms-2" onClick={() => setStep(1)}>
          {dir === "rtl" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {t("register.backToClubType")}
        </Button>

        {selectedType && (
          <Card className="overflow-hidden border-primary/30">
            <div className="flex flex-col sm:flex-row">
              <div className="relative sm:w-48 md:w-56 shrink-0 aspect-[4/3] sm:aspect-auto sm:min-h-[140px] bg-muted">
                <ClubTypeImage
                  clubTypeId={form.clubType}
                  alt={language === "ar" ? selectedType.nameAr : selectedType.nameEn}
                />
              </div>
              <CardContent className="flex flex-1 items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("register.selectedClubType")}</p>
                  <p className="font-bold text-xl mt-1">
                    {language === "ar" ? selectedType.nameAr : selectedType.nameEn}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {language === "ar" ? selectedType.descriptionAr : selectedType.descriptionEn}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setStep(1)}>
                  {t("register.change")}
                </Button>
              </CardContent>
            </div>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Label className="text-base font-semibold">{t("register.plan")}</Label>
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all ${form.planSlug === plan.slug ? "ring-2 ring-primary" : "hover:border-primary/50"}`}
                onClick={() => setForm((f) => ({ ...f, planSlug: plan.slug }))}
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="text-end flex items-center gap-3">
                    <div>
                      <p className="text-2xl font-bold">${plan.priceMonthly}</p>
                      <p className="text-xs text-muted-foreground">/month</p>
                    </div>
                    {form.planSlug === plan.slug && <Check className="h-5 w-5 text-primary" />}
                  </div>
                </CardContent>
              </Card>
            ))}
            <p className="text-sm text-muted-foreground">{t("register.trialNote")}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("register.accountTitle")}</CardTitle>
              <CardDescription>{t("register.accountDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("register.clubName")} *</Label>
                <Input value={form.clubName} onChange={(e) => setForm((f) => ({ ...f, clubName: e.target.value }))} placeholder={t("register.clubNamePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("register.adminName")} *</Label>
                <Input value={form.adminName} onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("register.email")} *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("register.phone")}</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("register.password")} *</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("register.confirmPassword")} *</Label>
                <Input type="password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("register.creating")}</> : t("register.submit")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
