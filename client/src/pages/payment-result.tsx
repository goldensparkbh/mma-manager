import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiJson } from "@/lib/api";
import { useLanguage } from "@/context/language-context";

export default function PaymentResult() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [tapId, setTapId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTapId(params.get("tap_id"));
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/tenant/payments/confirm", tapId],
    queryFn: () => apiJson<{ ok: boolean; status: string }>(`/api/tenant/payments/confirm?tap_id=${encodeURIComponent(tapId!)}`),
    enabled: !!tapId,
    retry: 1,
  });

  const success = data?.ok === true;

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setLocation("/"), 4000);
      return () => clearTimeout(timer);
    }
  }, [success, setLocation]);

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
            {isLoading
              ? t("payment.verifyingDesc")
              : success
                ? t("payment.successDesc")
                : isError
                  ? t("payment.failedDesc")
                  : t("payment.failedDesc")}
          </p>
          <div className="flex flex-col gap-2">
            {success ? (
              <Button onClick={() => setLocation("/")}>{t("payment.goToDashboard")}</Button>
            ) : (
              <>
                <Link href="/billing">
                  <Button className="w-full">{t("payment.tryAgain")}</Button>
                </Link>
                <Link href="/billing">
                  <Button variant="outline" className="w-full">{t("payment.backToBilling")}</Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
