import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { LoginClubShowcase } from "@/components/login-club-showcase";

export default function Login() {
  const { toast } = useToast();
  const { clubSettings, login } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast({ title: t("common.error"), description: t("login.errorMissing"), variant: "destructive" });
      return;
    }
    try {
      setIsSubmitting(true);
      const { redirectTo } = await login(email, password);
      setLocation(redirectTo);
    } catch (err) {
      toast({
        title: t("common.error"),
        description: (err as Error).message || t("login.errorFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full">
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        <LoginClubShowcase />
      </div>

      <div className="relative z-10 grid min-h-screen w-full lg:grid-cols-[1.5fr_1fr]">
        <div className="hidden lg:block" />

        <div className="flex flex-col items-center justify-center p-8 bg-background lg:bg-background/65 lg:backdrop-blur-md">
          {(clubSettings?.logoUrlLight || clubSettings?.logoUrlDark) ? (
            <img
              src={clubSettings?.logoUrlLight || clubSettings?.logoUrlDark}
              alt={clubSettings?.name || t("login.logoAlt")}
              className="w-48 mb-6 object-contain max-h-32"
            />
          ) : (
            <h1 className="text-4xl font-black mb-8 text-primary uppercase tracking-tighter">
              {clubSettings?.name || t("common.appName")}
            </h1>
          )}
          <Card className="w-full max-w-md border-none shadow-none lg:border lg:border-border/50 lg:bg-card/85 lg:shadow-sm lg:backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center text-3xl font-bold tracking-tight">{t("login.title")}</CardTitle>
              <p className="text-center text-sm text-muted-foreground">{t("login.subtitle")}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder={t("login.emailPlaceholder")}
                  className="h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-login-email"
                />
                <Input
                  type="password"
                  placeholder={t("login.passwordPlaceholder")}
                  className="h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                  data-testid="input-login-password"
                />
                <Button
                  className="w-full h-11 text-base"
                  onClick={handleEmailLogin}
                  disabled={isSubmitting}
                  data-testid="button-login-email"
                >
                  {isSubmitting ? t("login.loading") : t("login.button")}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-primary hover:underline font-medium">
                    Register your club
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
