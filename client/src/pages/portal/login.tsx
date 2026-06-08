import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { usePortalAuth } from "@/context/portal-auth-context";
import { PlatformBranding } from "@/components/platform-branding";

export default function PortalLogin() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { clubName, login, loading, member, slug } = usePortalAuth();
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && member) {
    setLocation(`/portal/${slug}/home`);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(phone, password);
      setLocation(`/portal/${slug}/home`);
    } catch (err) {
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
      <div className="mb-8 text-center">
        <PlatformBranding centered titleClassName="text-2xl font-bold" subtitleClassName="text-sm text-muted-foreground mt-1" />
        {clubName && <p className="mt-4 text-lg font-semibold">{clubName}</p>}
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{t("portal.loginTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("portal.phone")}</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+973..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("portal.password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <LogIn className="h-4 w-4 me-2" />}
              {t("portal.loginButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
