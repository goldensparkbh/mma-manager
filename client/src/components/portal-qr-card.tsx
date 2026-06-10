import { useQuery } from "@tanstack/react-query";
import { Loader2, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";
import { portalApiJson } from "@/lib/portal-api";

export function PortalQrCard() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery<{ checkInUrl: string }>({
    queryKey: ["/api/portal/qr"],
    queryFn: () => portalApiJson("/api/portal/qr"),
  });

  const url = data?.checkInUrl;

  return (
    <Card>
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          {t("portal.checkInQr")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground text-center">{t("portal.checkInQrHint")}</p>
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : url ? (
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`}
            alt={t("portal.checkInQr")}
            className="rounded-lg border bg-white p-2"
            width={240}
            height={240}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("common.error")}</p>
        )}
      </CardContent>
    </Card>
  );
}
