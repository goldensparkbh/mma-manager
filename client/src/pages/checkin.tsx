import { useCallback, useEffect, useState } from "react";
import { useRoute } from "wouter";
import { CheckCircle2, Loader2, QrCode, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";
import { QrScanner } from "@/components/qr-scanner";

async function doCheckIn(slug: string, token: string) {
  const res = await fetch(`/api/public/${slug}/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrToken: token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Check-in failed");
  return data as { member?: { name?: string }; action?: "checkin" | "checkout" };
}

export default function CheckInPage() {
  const { t } = useLanguage();
  const [, params] = useRoute("/checkin/:slug");
  const slug = params?.slug || "";
  const urlToken = new URLSearchParams(window.location.search).get("t");
  const [status, setStatus] = useState<"scan" | "loading" | "ok" | "error">(urlToken ? "loading" : "scan");
  const [message, setMessage] = useState("");
  const [memberName, setMemberName] = useState("");

  const runCheckIn = useCallback(
    async (token: string) => {
      if (!slug) return;
      setStatus("loading");
      try {
        const data = await doCheckIn(slug, token);
        setMemberName(data.member?.name || "");
        setMessage(data.action === "checkout" ? t("checkin.checkedOut") : t("checkin.success"));
        setStatus("ok");
      } catch (err) {
        setMessage((err as Error).message);
        setStatus("error");
      }
    },
    [slug, t],
  );

  useEffect(() => {
    if (urlToken && slug) runCheckIn(urlToken);
  }, [urlToken, slug, runCheckIn]);

  const handleScan = (token: string) => {
    runCheckIn(token).then(() => {
      setTimeout(() => {
        setStatus("scan");
        setMessage("");
        setMemberName("");
      }, 2500);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <QrCode className="h-12 w-12 mx-auto text-primary mb-2" />
          <CardTitle>{t("checkin.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className={`text-sm text-muted-foreground ${status === "scan" && !urlToken ? "" : "sr-only"}`}>
            {t("checkin.scannerHint")}
          </p>
          {!urlToken && (
            <QrScanner onScan={handleScan} active={status === "scan"} />
          )}
          {status === "loading" && <Loader2 className="h-10 w-10 animate-spin mx-auto" />}
          {status === "ok" && <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />}
          {status === "error" && <XCircle className="h-12 w-12 text-destructive mx-auto" />}
          {memberName && <p className="font-semibold text-lg">{memberName}</p>}
          {message && <p className="text-muted-foreground">{message}</p>}
          {status === "ok" && !urlToken && (
            <p className="text-xs text-muted-foreground">{t("checkin.scanAgain")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
