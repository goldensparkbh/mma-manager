import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, LogIn, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { usePortalAuth } from "@/context/portal-auth-context";
import { PlatformBranding } from "@/components/platform-branding";

export default function PortalLogin() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { clubName, login, loginWithOtp, requestOtp, loading, member, slug } = usePortalAuth();
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    if (!loading && member) {
      setLocation(`/portal/${slug}/home`);
    }
  }, [loading, member, slug, setLocation]);

  if (!loading && member) {
    return null;
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
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

  const handleRequestOtp = async () => {
    setSendingOtp(true);
    try {
      const result = await requestOtp(phone);
      setOtpSent(true);
      toast({
        title: t("common.success"),
        description: result.sentVia === "email" ? t("portal.otpSentEmail") : t("portal.otpSentConsole"),
      });
    } catch (err) {
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await loginWithOtp(phone, otpCode);
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
          <Tabs defaultValue="otp">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="otp" className="flex-1">{t("portal.otpTab")}</TabsTrigger>
              <TabsTrigger value="password" className="flex-1">{t("portal.passwordTab")}</TabsTrigger>
            </TabsList>

            <TabsContent value="otp">
              <form onSubmit={handleOtpLogin} className="space-y-4">
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
                {!otpSent ? (
                  <Button type="button" className="w-full" disabled={!phone || sendingOtp} onClick={handleRequestOtp}>
                    {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <MessageSquare className="h-4 w-4 me-2" />}
                    {t("portal.sendOtp")}
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>{t("portal.otpCode")}</Label>
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={otpCode.length < 6 || submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <LogIn className="h-4 w-4 me-2" />}
                      {t("portal.verifyOtp")}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full text-sm" onClick={handleRequestOtp} disabled={sendingOtp}>
                      {t("portal.resendOtp")}
                    </Button>
                  </>
                )}
              </form>
            </TabsContent>

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
