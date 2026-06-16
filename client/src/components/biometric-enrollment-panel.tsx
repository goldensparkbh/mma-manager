import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fingerprint, ScanFace, Trash2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { FaceCapture } from "@/components/face-capture";
import { captureFingerprint, getBridgeStatus } from "@/lib/fingerprintBridge";
import { verifyEnrollmentPair } from "@/lib/faceRecognition";
import type { AttendanceMethodsConfig } from "@shared/schema";

type BiometricStatus = {
  memberId: string;
  hasFingerprint: boolean;
  hasFace: boolean;
  fingerprintEnrolledAt?: string | null;
  faceEnrolledAt?: string | null;
};

type Props = {
  memberId: string;
  memberName: string;
};

export function BiometricEnrollmentPanel({ memberId, memberName }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [faceStep, setFaceStep] = useState<0 | 1 | 2>(0);
  const [faceScan1, setFaceScan1] = useState<number[] | null>(null);
  const [fpStep, setFpStep] = useState<0 | 1 | 2>(0);
  const [fpScan1, setFpScan1] = useState<string | null>(null);

  const { data: methods } = useQuery<AttendanceMethodsConfig>({
    queryKey: ["/api/attendance/methods"],
    queryFn: () => apiJson("/api/attendance/methods"),
  });

  const { data: status, isLoading } = useQuery<BiometricStatus>({
    queryKey: ["/api/members", memberId, "biometrics"],
    queryFn: () => apiJson(`/api/members/${memberId}/biometrics`),
    enabled: !!memberId,
  });

  const { data: bridgeStatus } = useQuery({
    queryKey: ["fingerprint-bridge", methods?.fingerprintBridgeUrl],
    queryFn: () => getBridgeStatus(methods?.fingerprintBridgeUrl),
    enabled: !!methods?.fingerprint,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/members", memberId, "biometrics"] });
  };

  const enrollFace = useMutation({
    mutationFn: (payload: { descriptor1: number[]; descriptor2: number[] }) =>
      apiJson(`/api/members/${memberId}/biometrics/face`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast({ title: t("biometrics.faceEnrolled") });
      setFaceStep(0);
      setFaceScan1(null);
      invalidate();
    },
    onError: (e) => toast({ variant: "destructive", title: t("common.error"), description: (e as Error).message }),
  });

  const enrollFp = useMutation({
    mutationFn: (payload: { template1: string; template2: string }) =>
      apiJson(`/api/members/${memberId}/biometrics/fingerprint`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast({ title: t("biometrics.fingerprintEnrolled") });
      setFpStep(0);
      setFpScan1(null);
      invalidate();
    },
    onError: (e) => toast({ variant: "destructive", title: t("common.error"), description: (e as Error).message }),
  });

  const clearFace = useMutation({
    mutationFn: () => apiJson(`/api/members/${memberId}/biometrics/face`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast({ title: t("common.success") }); },
  });

  const clearFp = useMutation({
    mutationFn: () => apiJson(`/api/members/${memberId}/biometrics/fingerprint`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast({ title: t("common.success") }); },
  });

  const onFaceCapture = (descriptor: number[]) => {
    if (faceStep === 0) {
      setFaceScan1(descriptor);
      setFaceStep(1);
      toast({ title: t("biometrics.scan1Done") });
      return;
    }
    if (!faceScan1) return;
    if (!verifyEnrollmentPair(faceScan1, descriptor)) {
      toast({ variant: "destructive", title: t("biometrics.scansMismatch") });
      setFaceStep(0);
      setFaceScan1(null);
      return;
    }
    enrollFace.mutate({ descriptor1: faceScan1, descriptor2: descriptor });
  };

  const onFingerprintScan = async () => {
    if (bridgeStatus !== "online") {
      toast({ variant: "destructive", title: t("biometrics.bridgeOffline") });
      return;
    }
    try {
      const template = await captureFingerprint(methods?.fingerprintBridgeUrl);
      if (fpStep === 0) {
        setFpScan1(template);
        setFpStep(1);
        toast({ title: t("biometrics.scan1Done") });
        return;
      }
      if (!fpScan1) return;
      enrollFp.mutate({ template1: fpScan1, template2: template });
    } catch (e) {
      toast({ variant: "destructive", title: t("common.error"), description: (e as Error).message });
    }
  };

  if (isLoading) return null;
  if (!methods?.face && !methods?.fingerprint) {
    return (
      <p className="text-sm text-muted-foreground">{t("biometrics.notEnabled")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("biometrics.enrollHint")} <span className="font-medium">{memberName}</span>
      </p>

      {methods?.face ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ScanFace className="h-4 w-4" />
              {t("biometrics.face")}
              {status?.hasFace ? (
                <Badge variant="secondary" className="ms-auto gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {t("biometrics.enrolled")}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {status?.hasFace ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("biometrics.enrolledAt")}</span>
                <Button size="sm" variant="ghost" onClick={() => clearFace.mutate()}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {faceStep === 0 ? t("biometrics.faceScan1") : t("biometrics.faceScan2")}
                </p>
                <FaceCapture onCapture={onFaceCapture} disabled={enrollFace.isPending} />
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {methods?.fingerprint ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Fingerprint className="h-4 w-4" />
              {t("biometrics.fingerprint")}
              {status?.hasFingerprint ? (
                <Badge variant="secondary" className="ms-auto gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {t("biometrics.enrolled")}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {bridgeStatus === "online" ? t("biometrics.bridgeOnline") : t("biometrics.bridgeOffline")}
            </p>
            {status?.hasFingerprint ? (
              <Button size="sm" variant="ghost" onClick={() => clearFp.mutate()}>
                <Trash2 className="h-4 w-4 text-destructive me-1" /> {t("biometrics.remove")}
              </Button>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {fpStep === 0 ? t("biometrics.fpScan1") : t("biometrics.fpScan2")}
                </p>
                <Button
                  className="w-full"
                  disabled={bridgeStatus !== "online" || enrollFp.isPending}
                  onClick={onFingerprintScan}
                >
                  {t("biometrics.scanFingerprint")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
