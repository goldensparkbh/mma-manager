import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, QrCode, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { QrScanner } from "@/components/qr-scanner";
import type { BookingSettings } from "@shared/schema";

export default function StaffScanPage() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"scan" | "loading" | "ok" | "error">("scan");
  const [message, setMessage] = useState("");
  const [memberName, setMemberName] = useState("");

  const { data: settings, isLoading } = useQuery<BookingSettings>({
    queryKey: ["/api/booking-settings"],
    queryFn: () => apiJson("/api/booking-settings"),
  });

  const slug = settings?.publicSlug || "";

  const handleScan = async (token: string) => {
    if (!slug) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/public/${slug}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");
      setMemberName((data.member as { name?: string })?.name || "");
      setMessage(data.alreadyCheckedIn ? t("checkin.already") : t("checkin.success"));
      setStatus("ok");
      setTimeout(() => {
        setStatus("scan");
        setMessage("");
        setMemberName("");
      }, 2500);
    } catch (err) {
      setMessage((err as Error).message);
      setStatus("error");
      setTimeout(() => {
        setStatus("scan");
        setMessage("");
      }, 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!slug) {
    return (
      <p className="text-center text-muted-foreground py-12">{t("checkin.noSlug")}</p>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader className="text-center">
          <QrCode className="h-10 w-10 mx-auto text-primary mb-2" />
          <CardTitle>{t("checkin.scannerTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("checkin.scannerHint")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "scan" && <QrScanner onScan={handleScan} />}
          {status === "loading" && <Loader2 className="h-10 w-10 animate-spin mx-auto" />}
          {status === "ok" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              {memberName && <p className="font-semibold text-lg text-center">{memberName}</p>}
            </>
          )}
          {status === "error" && <XCircle className="h-12 w-12 text-destructive mx-auto" />}
          {message && <p className="text-center text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
