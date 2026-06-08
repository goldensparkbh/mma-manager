import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import * as storage from "@/lib/storage";

export default function ProfileScreen() {
  const router = useRouter();
  const { member, activeSubscription, clubName, logout, api, portalInfo, refresh } = useAuth();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [family, setFamily] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qr, fam] = await Promise.all([
        api.get<{ checkInUrl: string }>("/api/portal/qr"),
        api.get<{ id: string; name: string }[]>("/api/portal/family-members").catch(() => []),
      ]);
      setQrUrl(qr.checkInUrl);
      setFamily(fam);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const switchMember = async (memberId: string) => {
    const result = await api.post<{ token: string }>("/api/portal/switch-member", { memberId });
    await storage.setToken(result.token);
    api.setToken(result.token);
    await refresh();
    await load();
  };

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const accent = portalInfo?.primaryColor || "#3b82f6";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.header, { borderTopColor: accent }]}>
        <Text style={styles.club}>{clubName}</Text>
        <Text style={styles.name}>{member?.name}</Text>
        <Text style={styles.phone}>{member?.phone}</Text>
        <Text style={styles.sub}>
          {activeSubscription ? activeSubscription.planName : "No active subscription"}
        </Text>
        {activeSubscription?.packageType === "sessions" ? (
          <Text style={styles.sub}>Sessions left: {activeSubscription.sessionsRemaining ?? 0}</Text>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={accent} style={{ marginVertical: 24 }} />
      ) : qrUrl ? (
        <View style={styles.qrBox}>
          <Text style={styles.qrLabel}>Check-in QR</Text>
          <QRCode value={qrUrl} size={200} />
          <Text style={styles.qrHint}>Show at club entrance</Text>
        </View>
      ) : null}

      {family.length > 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family members</Text>
          {family.map((m) => (
            <Pressable
              key={m.id}
              style={[styles.familyRow, m.id === member?.id && styles.familyActive]}
              onPress={() => m.id !== member?.id && switchMember(m.id)}
            >
              <Text>{m.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  header: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  club: { fontSize: 13, color: "#64748b" },
  name: { fontSize: 22, fontWeight: "700", marginTop: 4, color: "#0f172a" },
  phone: { color: "#64748b", marginTop: 2 },
  sub: { marginTop: 8, color: "#334155" },
  qrBox: { alignItems: "center", marginTop: 24, backgroundColor: "#fff", padding: 20, borderRadius: 12 },
  qrLabel: { fontWeight: "600", marginBottom: 12 },
  qrHint: { marginTop: 12, color: "#64748b", fontSize: 13 },
  section: { marginTop: 24 },
  sectionTitle: { fontWeight: "600", marginBottom: 8 },
  familyRow: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  familyActive: { borderColor: "#3b82f6", backgroundColor: "#eff6ff" },
  logout: {
    marginTop: 32,
    backgroundColor: "#fee2e2",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "#dc2626", fontWeight: "600" },
});
