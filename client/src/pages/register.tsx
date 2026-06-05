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
import type { PlatformSubscriptionPlan } from "@shared/schema";
import { Building2, Check, Loader2 } from "lucide-react";

export default function Register() {
  const { toast } = useToast();
  const { register } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clubName: "",
    adminName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    planSlug: "starter",
  });

  const { data: plans = [] } = useQuery<PlatformSubscriptionPlan[]>({
    queryKey: ["/api/plans"],
    queryFn: () => apiJson("/api/plans"),
  });

  const handleSubmit = async () => {
    if (!form.clubName || !form.adminName || !form.email || !form.password) {
      toast({ variant: "destructive", title: t("common.error"), description: "All required fields must be filled" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ variant: "destructive", title: t("common.error"), description: "Passwords do not match" });
      return;
    }
    if (form.password.length < 6) {
      toast({ variant: "destructive", title: t("common.error"), description: "Password must be at least 6 characters" });
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
      });
      toast({ title: t("common.success"), description: "Your club has been created! 14-day free trial started." });
      setLocation("/");
    } catch (err) {
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Start Your Club</h1>
              <p className="text-muted-foreground">Register and get your own isolated management system</p>
            </div>
          </div>

          <div className="space-y-3">
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Up to {plan.maxMembers} members · {plan.maxUsers} users
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${plan.priceMonthly}</p>
                    <p className="text-xs text-muted-foreground">/month</p>
                    {form.planSlug === plan.slug && <Check className="h-5 w-5 text-primary ml-auto mt-1" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">All plans include a 14-day free trial. No credit card required.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Set up your club administrator account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Club Name *</Label>
              <Input value={form.clubName} onChange={(e) => setForm((f) => ({ ...f, clubName: e.target.value }))} placeholder="My MMA Club" />
            </div>
            <div className="space-y-2">
              <Label>Your Name *</Label>
              <Input value={form.adminName} onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))} placeholder="Admin Name" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password *</Label>
              <Input type="password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Club & Start Trial"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
