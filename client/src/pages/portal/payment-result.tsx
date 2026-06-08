import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";
import { usePortalAuth } from "@/context/portal-auth-context";
import { portalApiJson } from "@/lib/portal-api";
import { useLocation } from "wouter";

export default function PortalPaymentResult() {
  const { t } = useLanguage();
  const { slug } = usePortalAuth();
  const [, setLocation] = useLocation();
  const [tapId, setTapId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTapId(params.get("tap_id"));
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/portal/payments/confirm", tapId],
    queryFn: () =>
      portalApiJson<{ ok: boolean; status: string }>(
        `/api/portal/payments/confirm?tap_id=${encodeURIComponent(tapId!)}`,
      ),
    enabled: !!tapId,
    retry: 1,
  });

  const success = data?.ok === true;

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setLocation(`/portal/${slug}/home`), 4000);
      return () => clearTimeout(timer);
    }
  }, [success, setLocation, slug]);

  if (!tapId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center text-muted-foreground">
            {t("payment.missingId")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {isLoading ? (
            <Loader2 className="h-14 w-14 animate-spin text-primary mx-auto" />
          ) : success ? (
            <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
          ) : (
            <XCircle className="h-14 w-14 text-destructive mx-auto" />
          )}
          <CardTitle className="mt-4">
            {isLoading ? t("payment.verifying") : success ? t("payment.successTitle") : t("payment.failedTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {isLoading ? t("payment.verifyingDesc") : success ? t("portal.paymentSuccess") : t("payment.failedDesc")}
          </p>
          <Button onClick={() => setLocation(`/portal/${slug}/home`)} className="w-full">
            {t("portal.backToPortal")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
