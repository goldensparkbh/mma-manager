import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { CheckCircle2, Loader2, QrCode, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";

export default function CheckInPage() {
  const { t } = useLanguage();
  const [, params] = useRoute("/checkin/:slug");
  const slug = params?.slug || "";
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [memberName, setMemberName] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("t");
    if (!slug || !token) return;
    setStatus("loading");
    fetch(`/api/public/${slug}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken: token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Check-in failed");
        setMemberName((data.member as { name?: string })?.name || "");
        setMessage(data.alreadyCheckedIn ? t("checkin.already") : t("checkin.success"));
        setStatus("ok");
      })
      .catch((err) => {
        setMessage((err as Error).message);
        setStatus("error");
      });
  }, [slug, t]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <QrCode className="h-12 w-12 mx-auto text-primary mb-2" />
          <CardTitle>{t("checkin.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === "loading" && <Loader2 className="h-10 w-10 animate-spin mx-auto" />}
          {status === "ok" && <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />}
          {status === "error" && <XCircle className="h-12 w-12 text-destructive mx-auto" />}
          {memberName && <p className="font-semibold text-lg">{memberName}</p>}
          <p className="text-muted-foreground">{message || t("checkin.scanHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
