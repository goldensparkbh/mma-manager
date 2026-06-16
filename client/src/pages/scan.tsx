import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Fingerprint, Loader2, QrCode, ScanFace, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { QrScanner } from "@/components/qr-scanner";
import { FaceCapture } from "@/components/face-capture";
import { captureFingerprint } from "@/lib/fingerprintBridge";
import type { AttendanceMethodsConfig, BookingSettings } from "@shared/schema";

type ScanState = "ready" | "loading" | "ok" | "error";

export default function StaffScanPage() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ScanState>("ready");
  const [message, setMessage] = useState("");
  const [memberName, setMemberName] = useState("");
  const [tab, setTab] = useState("qr");

  const { data: settings, isLoading: loadingSettings } = useQuery<BookingSettings>({
    queryKey: ["/api/booking-settings"],
    queryFn: () => apiJson("/api/booking-settings"),
  });

  const slug = settings?.publicSlug || "";

  const { data: methods } = useQuery<AttendanceMethodsConfig>({
    queryKey: ["/api/public", slug, "attendance-methods"],
    queryFn: () => apiJson(`/api/public/${slug}/attendance-methods`),
    enabled: !!slug,
  });

  const resetSoon = () => {
    setTimeout(() => {
      setStatus("ready");
      setMessage("");
      setMemberName("");
    }, 2500);
  };

  const showResult = (data: { member?: { name?: string }; action?: string }, err?: string) => {
    if (err) {
      setMessage(err);
      setStatus("error");
      resetSoon();
      return;
    }
    setMemberName((data.member as { name?: string })?.name || "");
    setMessage(data.action === "checkout" ? t("checkin.checkedOut") : t("checkin.success"));
    setStatus("ok");
    resetSoon();
  };

  const handleQr = async (token: string) => {
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
      showResult(data);
    } catch (err) {
      showResult({}, (err as Error).message);
    }
  };

  const handleFace = async (descriptor: number[]) => {
    if (!slug) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/public/${slug}/checkin/face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");
      showResult(data);
    } catch (err) {
      showResult({}, (err as Error).message);
    }
  };

  const handleFingerprint = async () => {
    if (!slug) return;
    setStatus("loading");
    try {
      const template = await captureFingerprint(methods?.fingerprintBridgeUrl);
      const res = await fetch(`/api/public/${slug}/checkin/fingerprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");
      showResult(data);
    } catch (err) {
      showResult({}, (err as Error).message);
    }
  };

  if (loadingSettings) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!slug) {
    return <p className="text-center text-muted-foreground py-12">{t("checkin.noSlug")}</p>;
  }

  const enabledTabs = [
    methods?.qr !== false && { id: "qr", icon: QrCode, label: t("biometrics.methodQr") },
    methods?.face && { id: "face", icon: ScanFace, label: t("biometrics.methodFace") },
    methods?.fingerprint && { id: "fingerprint", icon: Fingerprint, label: t("biometrics.methodFingerprint") },
  ].filter(Boolean) as { id: string; icon: typeof QrCode; label: string }[];

  const activeTab = enabledTabs.some((x) => x.id === tab) ? tab : enabledTabs[0]?.id || "qr";

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{t("checkin.scannerTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("checkin.scannerHint")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "ok" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              {memberName && <p className="font-semibold text-lg text-center">{memberName}</p>}
            </>
          )}
          {status === "error" && <XCircle className="h-12 w-12 text-destructive mx-auto" />}
          {message && status !== "ready" && <p className="text-center text-muted-foreground">{message}</p>}

          {status === "loading" && <Loader2 className="h-10 w-10 animate-spin mx-auto" />}

          {status === "ready" && enabledTabs.length > 1 ? (
            <Tabs value={activeTab} onValueChange={setTab}>
              <TabsList className="w-full">
                {enabledTabs.map((x) => (
                  <TabsTrigger key={x.id} value={x.id} className="flex-1 gap-1">
                    <x.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{x.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="qr" className="mt-4">
                {(methods?.qr !== false) && <QrScanner onScan={handleQr} />}
              </TabsContent>
              <TabsContent value="face" className="mt-4">
                <FaceCapture onCapture={handleFace} label={t("biometrics.checkInFace")} />
              </TabsContent>
              <TabsContent value="fingerprint" className="mt-4">
                <Button className="w-full" onClick={handleFingerprint}>
                  {t("biometrics.scanFingerprint")}
                </Button>
              </TabsContent>
            </Tabs>
          ) : status === "ready" ? (
            <>
              {methods?.face && !methods?.qr ? (
                <FaceCapture onCapture={handleFace} label={t("biometrics.checkInFace")} />
              ) : methods?.fingerprint && !methods?.qr && !methods?.face ? (
                <Button className="w-full" onClick={handleFingerprint}>
                  {t("biometrics.scanFingerprint")}
                </Button>
              ) : (
                methods?.qr !== false && <QrScanner onScan={handleQr} />
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
