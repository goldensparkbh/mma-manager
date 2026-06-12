import * as Haptics from "expo-haptics";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import { Card, PrimaryButton, StaffHeader } from "@/lib/components";
import { useTypography } from "@/lib/fonts";
import { useBookingSettings, useQrCheckIn } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { parseQrToken } from "@/lib/qr";
import { spacing, useThemeColors } from "@/lib/theme";
import { useQueryClient } from "@tanstack/react-query";

type ScanState = "ready" | "loading" | "ok" | "error";

export default function ScanScreen() {
  const { tenant } = useAuth();
  const { t } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const { data: settings } = useBookingSettings();
  const slug = settings?.publicSlug || tenant?.slug || "";
  const checkIn = useQrCheckIn(slug);

  const [status, setStatus] = useState<ScanState>("ready");
  const [message, setMessage] = useState("");
  const [memberName, setMemberName] = useState("");
  const [scanning, setScanning] = useState(true);
  const busy = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setScanning(true);
      setStatus("ready");
      setMessage("");
      setMemberName("");
      busy.current = false;
    }, []),
  );

  const handleScan = async (data: string) => {
    if (!slug || busy.current || !scanning) return;
    busy.current = true;
    setScanning(false);
    setStatus("loading");
    try {
      const result = await checkIn.mutateAsync(parseQrToken(data));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMemberName(result.member?.name || "");
      setMessage(result.action === "checkout" ? t("scan.checkOutOk") : t("scan.checkInOk"));
      setStatus("ok");
      qc.invalidateQueries({ queryKey: ["staff", "attendance"] });
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage((e as Error).message);
      setStatus("error");
    }
    setTimeout(() => {
      setStatus("ready");
      setMessage("");
      setMemberName("");
      setScanning(true);
      busy.current = false;
    }, 2800);
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <StaffHeader title={t("scan.permissionTitle")} subtitle={t("scan.permissionSub")} tenantName={tenant?.name} />
        <PrimaryButton label={t("scan.allowCamera")} onPress={requestPermission} />
      </View>
    );
  }

  if (!slug) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <StaffHeader title={t("scan.permissionTitle")} subtitle={t("scan.noSlug")} tenantName={tenant?.name} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StaffHeader title={t("scan.title")} subtitle={t("scan.subtitle")} tenantName={tenant?.name} />
      <View style={styles.cameraWrap}>
        {scanning && status === "ready" ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => handleScan(data)}
          />
        ) : (
          <View style={[styles.camera, styles.overlay, { backgroundColor: colors.card }]}>
            {status === "loading" ? <ActivityIndicator size="large" color={colors.primary} /> : null}
            {status === "ok" ? <Text style={[styles.iconOk, { color: colors.success }]}>✓</Text> : null}
            {status === "error" ? <Text style={[styles.iconErr, { color: colors.danger }]}>✕</Text> : null}
          </View>
        )}
      </View>
      <Card style={styles.footer}>
        {memberName ? <Text style={[styles.name, { color: colors.text }, typo.style("bold")]}>{memberName}</Text> : null}
        <Text style={[styles.msg, { color: status === "error" ? colors.danger : colors.success }, typo.style("semibold")]}>
          {message || t("scan.ready")}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.md },
  center: { flex: 1, padding: spacing.md, justifyContent: "center" },
  cameraWrap: { flex: 1, borderRadius: 16, overflow: "hidden", marginBottom: spacing.md },
  camera: { flex: 1 },
  overlay: { alignItems: "center", justifyContent: "center" },
  footer: { alignItems: "center" },
  name: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  msg: { fontSize: 15, fontWeight: "600" },
  iconOk: { fontSize: 72 },
  iconErr: { fontSize: 72 },
});
