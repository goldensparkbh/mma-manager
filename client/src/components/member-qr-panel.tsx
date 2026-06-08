import { useQuery } from "@tanstack/react-query";
import { Copy, Loader2, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";

type QrResponse = { token: string; checkInUrl: string };

export function MemberQrPanel({ memberId }: { memberId: string }) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<QrResponse>({
    queryKey: ["/api/members", memberId, "qr"],
    queryFn: () => apiJson(`/api/members/${memberId}/qr`),
    enabled: !!memberId,
  });

  const copyUrl = async () => {
    if (!data?.checkInUrl) return;
    await navigator.clipboard.writeText(data.checkInUrl);
    toast({ title: t("members.qrCopied") });
  };

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;

  if (!data) return null;

  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.checkInUrl)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          {t("members.qrTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <img src={qrImg} alt="QR" className="rounded-lg border" width={200} height={200} />
        <p className="text-sm text-muted-foreground text-center">{t("members.qrHint")}</p>
        <Button variant="outline" size="sm" onClick={copyUrl}>
          <Copy className="h-4 w-4 me-2" />
          {t("members.qrCopy")}
        </Button>
      </CardContent>
    </Card>
  );
}
