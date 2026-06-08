import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { parseQrToken } from "@/lib/qr";
import type { BookingSettings } from "@/lib/types";
import { getApiUrl } from "@/lib/config";

type ScanState = "ready" | "loading" | "ok" | "error";

export default function ScanScreen() {
  const { api } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<ScanState>("ready");
  const [message, setMessage] = useState("");
  const [memberName, setMemberName] = useState("");
  const [scanning, setScanning] = useState(true);
  const busy = useRef(false);

  const loadSlug = useCallback(async () => {
    try {
      const settings = await api.get<BookingSettings>("/api/booking-settings");
      setSlug(settings.publicSlug || "");
    } catch {
      setSlug("");
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      loadSlug();
      setScanning(true);
      setStatus("ready");
      setMessage("");
      setMemberName("");
      busy.current = false;
    }, [loadSlug]),
  );

  const handleScan = async (data: string) => {
    if (!slug || busy.current || !scanning) return;
    busy.current = true;
    setScanning(false);
    setStatus("loading");
    const qrToken = parseQrToken(data);
    try {
      const res = await fetch(`${getApiUrl()}/api/public/${slug}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Check-in failed");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMemberName((body.member as { name?: string })?.name || "");
      setMessage(body.alreadyCheckedIn ? "Already checked in" : "Check-in successful");
      setStatus("ok");
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
    }, 2500);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Camera access is required to scan member QR codes.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  if (!slug) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Set a public check-in slug in booking settings on the web dashboard.</Text>
        <Pressable style={styles.buttonOutline} onPress={loadSlug}>
          <Text style={styles.buttonOutlineText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {scanning && status === "ready" ? (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => handleScan(data)}
        />
      ) : (
        <View style={[styles.camera, styles.overlay]}>
          {status === "loading" ? <ActivityIndicator size="large" color="#3b82f6" /> : null}
          {status === "ok" ? <Text style={styles.ok}>✓</Text> : null}
          {status === "error" ? <Text style={styles.err}>✕</Text> : null}
        </View>
      )}

      <View style={styles.footer}>
        {memberName ? <Text style={styles.name}>{memberName}</Text> : null}
        {message ? (
          <Text style={status === "error" ? styles.errText : styles.msg}>{message}</Text>
        ) : (
          <Text style={styles.hint}>Point camera at member QR code</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#0f172a" },
  camera: { flex: 1 },
  overlay: { alignItems: "center", justifyContent: "center", backgroundColor: "#1e293b" },
  footer: { padding: 20, alignItems: "center" },
  hint: { color: "#94a3b8", textAlign: "center", fontSize: 14 },
  msg: { color: "#4ade80", fontSize: 16, fontWeight: "600" },
  errText: { color: "#f87171", fontSize: 16, fontWeight: "600" },
  name: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  ok: { fontSize: 64, color: "#4ade80" },
  err: { fontSize: 64, color: "#f87171" },
  button: {
    marginTop: 16,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  buttonOutline: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonOutlineText: { color: "#94a3b8", fontWeight: "600" },
});
