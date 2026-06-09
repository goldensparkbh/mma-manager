import * as Haptics from "expo-haptics";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import { Card, PrimaryButton, StaffHeader } from "@/lib/components";
import { useBookingSettings, useQrCheckIn } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import { parseQrToken } from "@/lib/qr";
import { colors, spacing } from "@/lib/theme";
import { useQueryClient } from "@tanstack/react-query";

type ScanState = "ready" | "loading" | "ok" | "error";

export default function ScanScreen() {
  const { tenant } = useAuth();
  const { show } = useToast();
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
      setMessage(result.alreadyCheckedIn ? "Already checked in" : "Check-in successful");
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
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <StaffHeader title="QR Scanner" subtitle="Camera permission required" tenantName={tenant?.name} />
        <PrimaryButton label="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  if (!slug) {
    return (
      <View style={styles.center}>
        <StaffHeader title="QR Scanner" subtitle="Set public slug in booking settings" tenantName={tenant?.name} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StaffHeader title="Scan member QR" subtitle="Point at membership code" tenantName={tenant?.name} />
      <View style={styles.cameraWrap}>
        {scanning && status === "ready" ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => handleScan(data)}
          />
        ) : (
          <View style={[styles.camera, styles.overlay]}>
            {status === "loading" ? <ActivityIndicator size="large" color={colors.primary} /> : null}
            {status === "ok" ? <Text style={styles.iconOk}>✓</Text> : null}
            {status === "error" ? <Text style={styles.iconErr}>✕</Text> : null}
          </View>
        )}
      </View>
      <Card style={styles.footer}>
        {memberName ? <Text style={styles.name}>{memberName}</Text> : null}
        <Text style={[styles.msg, status === "error" && { color: colors.danger }]}>
          {message || "Ready to scan"}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  center: { flex: 1, backgroundColor: colors.bg, padding: spacing.md, justifyContent: "center" },
  cameraWrap: { flex: 1, borderRadius: 16, overflow: "hidden", marginBottom: spacing.md },
  camera: { flex: 1 },
  overlay: { alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  footer: { alignItems: "center" },
  name: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 4 },
  msg: { fontSize: 15, color: colors.success, fontWeight: "600" },
  iconOk: { fontSize: 72, color: colors.success },
  iconErr: { fontSize: 72, color: colors.danger },
});
