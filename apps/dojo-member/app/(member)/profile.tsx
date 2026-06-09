import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Card, ClubHeader, PrimaryButton, Screen, SectionTitle, Skeleton } from "@/lib/components";
import { QrIllustration } from "@/lib/illustrations";
import { useBranding } from "@/lib/branding";
import { useFamily, useQr } from "@/lib/hooks";
import * as storage from "@/lib/storage";
import { colors, spacing } from "@/lib/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { member, activeSubscription, clubName, logout, leaveClub, api, portalInfo, refresh } = useAuth();
  const { accent } = useBranding();
  const [qrOpen, setQrOpen] = useState(false);

  const { data: qr, isLoading: loadingQr } = useQr();
  const { data: familyData } = useFamily();
  const family: Array<{ id: string; name: string }> = familyData ?? [];

  const switchMember = async (memberId: string) => {
    const result = await api.post<{ token: string }>("/api/portal/switch-member", { memberId });
    await storage.setToken(result.token);
    api.setToken(result.token);
    await refresh();
    await Haptics.selectionAsync();
  };

  const onLogout = async () => {
    await logout();
    router.replace("/(discover)/account");
  };

  const onSwitchClub = async () => {
    await leaveClub();
    router.replace("/(discover)/clubs");
  };

  return (
    <>
      <Screen scroll>
        <ClubHeader clubName={clubName} logoUrl={portalInfo?.logoUrl} accent={accent} memberName={member?.name} />

        <Card style={styles.gap}>
          <Text style={styles.label}>Account</Text>
          <Text style={styles.value}>{member?.phone}</Text>
          {activeSubscription ? (
            <Text style={styles.meta}>{activeSubscription.planName}</Text>
          ) : (
            <Text style={styles.meta}>No active plan</Text>
          )}
        </Card>

        <PrimaryButton
          label={loadingQr ? "Loading QR…" : "Show check-in QR"}
          onPress={() => setQrOpen(true)}
          disabled={loadingQr || !qr?.checkInUrl}
        />

        {family.length > 1 ? (
          <>
            <SectionTitle title="Family members" />
            {family.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => m.id !== member?.id && switchMember(m.id)}
                style={[styles.familyRow, m.id === member?.id && { borderColor: accent, backgroundColor: "#eff6ff" }]}
              >
                <Text style={styles.familyName}>{m.name}</Text>
                {m.id === member?.id ? <Text style={[styles.activeTag, { color: accent }]}>Active</Text> : null}
              </Pressable>
            ))}
          </>
        ) : null}

        <PrimaryButton label="Browse all clubs" variant="outline" icon="compass" onPress={() => router.push("/(discover)")} />
        <PrimaryButton label="Switch club" variant="outline" onPress={onSwitchClub} />
        <PrimaryButton label="Sign out" variant="danger" onPress={onLogout} />
        <Text style={styles.version}>Dojo Member</Text>
      </Screen>

      <Modal visible={qrOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setQrOpen(false)}>
        <View style={[styles.qrModal, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.qrHeading}>Check-in QR</Text>
          <Text style={styles.qrHint}>Show this at the club entrance</Text>
          <QrIllustration size={120} />
          {loadingQr ? (
            <Skeleton height={220} style={{ width: 220 }} />
          ) : qr?.checkInUrl ? (
            <View style={styles.qrBox}>
              <QRCode value={qr.checkInUrl} size={240} backgroundColor="#fff" />
            </View>
          ) : null}
          <PrimaryButton label="Close" onPress={() => setQrOpen(false)} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 6 },
  label: { fontSize: 12, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase" },
  value: { fontSize: 18, fontWeight: "700", color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted },
  familyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  familyName: { fontSize: 16, fontWeight: "600", color: colors.text },
  activeTag: { fontSize: 12, fontWeight: "700" },
  version: { textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: 8 },
  qrModal: { flex: 1, backgroundColor: "#0f172a", paddingHorizontal: spacing.lg, alignItems: "center", justifyContent: "center", gap: 16 },
  qrHeading: { color: "#fff", fontSize: 24, fontWeight: "800" },
  qrHint: { color: "#94a3b8", fontSize: 14 },
  qrBox: { backgroundColor: "#fff", padding: 20, borderRadius: 20 },
});
