import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanFace, QrCode, Fingerprint, UserCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { getBridgeStatus } from "@/lib/fingerprintBridge";
import {
  DEFAULT_ATTENDANCE_METHODS,
  parseAttendanceMethods,
  type AttendanceMethodsConfig,
} from "@shared/schema";

export function AttendanceMethodsPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: methods, isLoading } = useQuery<AttendanceMethodsConfig>({
    queryKey: ["/api/attendance/methods"],
    queryFn: () => apiJson("/api/attendance/methods"),
  });

  const [draft, setDraft] = useState<AttendanceMethodsConfig | null>(null);
  const config = draft ?? methods ?? DEFAULT_ATTENDANCE_METHODS;

  const { data: bridgeStatus } = useQuery({
    queryKey: ["fingerprint-bridge", config.fingerprintBridgeUrl],
    queryFn: () => getBridgeStatus(config.fingerprintBridgeUrl),
    enabled: config.fingerprint,
  });

  const save = useMutation({
    mutationFn: () =>
      apiJson("/api/attendance/methods", {
        method: "PATCH",
        body: JSON.stringify(parseAttendanceMethods(config)),
      }),
    onSuccess: () => {
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["/api/attendance/methods"] });
      toast({ title: t("common.success") });
    },
    onError: (e) => toast({ variant: "destructive", title: t("common.error"), description: (e as Error).message }),
  });

  const set = (patch: Partial<AttendanceMethodsConfig>) => {
    setDraft({ ...config, ...patch });
  };

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("biometrics.methodsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MethodToggle
          icon={<QrCode className="h-4 w-4" />}
          label={t("biometrics.methodQr")}
          checked={config.qr}
          onCheckedChange={(qr) => set({ qr })}
        />
        <MethodToggle
          icon={<UserCheck className="h-4 w-4" />}
          label={t("biometrics.methodStaff")}
          checked={config.staff}
          onCheckedChange={(staff) => set({ staff })}
        />
        <MethodToggle
          icon={<Fingerprint className="h-4 w-4" />}
          label={t("biometrics.methodFingerprint")}
          checked={config.fingerprint}
          onCheckedChange={(fingerprint) => set({ fingerprint })}
        />
        {config.fingerprint ? (
          <div className="ms-8 space-y-2">
            <Label className="text-xs">{t("biometrics.bridgeUrl")}</Label>
            <Input
              value={config.fingerprintBridgeUrl || ""}
              onChange={(e) => set({ fingerprintBridgeUrl: e.target.value })}
              placeholder="http://127.0.0.1:9780"
            />
            <p className="text-xs text-muted-foreground">
              {bridgeStatus === "online" ? t("biometrics.bridgeOnline") : t("biometrics.bridgeOffline")}
            </p>
          </div>
        ) : null}
        <MethodToggle
          icon={<ScanFace className="h-4 w-4" />}
          label={t("biometrics.methodFace")}
          checked={config.face}
          onCheckedChange={(face) => set({ face })}
        />
        {config.face ? (
          <div className="ms-8 grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t("biometrics.faceThreshold")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0.2"
                max="0.8"
                value={config.faceMatchThreshold ?? 0.42}
                onChange={(e) => set({ faceMatchThreshold: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">{t("biometrics.faceMargin")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="0.3"
                value={config.faceMatchMinMargin ?? 0.08}
                onChange={(e) => set({ faceMatchMinMargin: Number(e.target.value) })}
              />
            </div>
            <p className="col-span-2 text-xs text-muted-foreground">{t("biometrics.faceTwinHint")}</p>
          </div>
        ) : null}
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
          {t("common.save")}
        </Button>
      </CardContent>
    </Card>
  );
}

function MethodToggle({
  icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
