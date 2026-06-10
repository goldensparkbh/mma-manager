import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Card, ClubHeader, IconRow, PrimaryButton, Screen, SectionTitle, Skeleton } from "@/lib/components";
import { QrIllustration } from "@/lib/illustrations";
import { useBranding } from "@/lib/branding";
import { useAttendance, useFamily, useProgression, useQr } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useTheme, type ThemeMode } from "@/lib/theme";
import * as storage from "@/lib/storage";
import { spacing, useThemeColors } from "@/lib/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { member, activeSubscription, clubName, logout, leaveClub, api, portalInfo, refresh } = useAuth();
  const { accent } = useBranding();
  const { t, locale, setLocale } = useI18n();
  const { mode, setMode } = useTheme();
  const [qrOpen, setQrOpen] = useState(false);

  const { data: qr, isLoading: loadingQr } = useQr();
  const { data: familyData } = useFamily();
  const { data: progression } = useProgression();
  const { data: attendance } = useAttendance();
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

  const cycleTheme = async () => {
    const order: ThemeMode[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    await setMode(next);
  };

  const toggleLanguage = async () => {
    await setLocale(locale === "en" ? "ar" : "en");
  };

  return (
    <>
      <Screen scroll>
        <ClubHeader clubName={clubName} logoUrl={portalInfo?.logoUrl} accent={accent} memberName={member?.name} />

        <Card style={styles.gap}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t("member.account")}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{member?.phone}</Text>
          {activeSubscription ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>{activeSubscription.planName}</Text>
          ) : (
            <Text style={[styles.meta, { color: colors.textMuted }]}>{t("member.noActivePlan")}</Text>
          )}
        </Card>

        <PrimaryButton
          label={loadingQr ? t("common.loading") : t("member.showQr")}
          icon="qr-code"
          onPress={async () => {
            const hw = await LocalAuthentication.hasHardwareAsync();
            if (hw) {
              const auth = await LocalAuthentication.authenticateAsync({ promptMessage: t("member.showQr") });
              if (!auth.success) return;
            }
            setQrOpen(true);
          }}
          disabled={loadingQr || !qr?.checkInUrl}
        />

        <PrimaryButton label={t("notifications.title")} variant="outline" icon="notifications" onPress={() => router.push("/notifications")} />

        <SectionTitle title={t("progression.title")} />
        {!progression?.memberBelts?.length ? (
          <Card><Text style={{ color: colors.textMuted }}>{t("progression.empty")}</Text></Card>
        ) : (
          progression.memberBelts.slice(0, 5).map((belt: { id: string; beltName?: string | null; beltColor?: string | null; stripes?: number; awardedAt?: string }) => (
            <Card key={belt.id} style={styles.gap}>
              <View style={styles.beltRow}>
                <View style={[styles.beltDot, { backgroundColor: belt.beltColor || accent }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.value, { color: colors.text }]}>{belt.beltName || "Belt"}</Text>
                  {belt.awardedAt ? (
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {format(new Date(belt.awardedAt), "d MMM yyyy")}
                    </Text>
                  ) : null}
                </View>
                {(belt.stripes ?? 0) > 0 ? (
                  <Text style={[styles.meta, { color: colors.textMuted }]}>{belt.stripes} stripes</Text>
                ) : null}
              </View>
            </Card>
          ))
        )}

        <SectionTitle title={t("attendance.title")} />
        {!attendance?.length ? (
          <Card><Text style={{ color: colors.textMuted }}>{t("attendance.empty")}</Text></Card>
        ) : (
          attendance.slice(0, 8).map((row: { id: string; date: string; checkIn?: string | null }) => (
            <Card key={row.id} style={styles.gap}>
              <IconRow
                icon="checkmark-circle"
                label={row.date}
                value={row.checkIn ? format(new Date(row.checkIn), "HH:mm") : "—"}
                accent={accent}
              />
            </Card>
          ))
        )}

        <SectionTitle title={t("member.settings")} />
        <Card style={styles.gap}>
          <Pressable onPress={toggleLanguage} style={styles.settingRow}>
            <Text style={{ color: colors.text, fontWeight: "600" }}>{t("settings.language")}</Text>
            <Text style={{ color: accent, fontWeight: "700" }}>{locale === "ar" ? "العربية" : "English"}</Text>
          </Pressable>
          <Pressable onPress={cycleTheme} style={styles.settingRow}>
            <Text style={{ color: colors.text, fontWeight: "600" }}>{t("settings.theme")}</Text>
            <Text style={{ color: accent, fontWeight: "700" }}>
              {mode === "system" ? t("settings.system") : mode === "dark" ? t("settings.dark") : t("settings.light")}
            </Text>
          </Pressable>
        </Card>

        {family.length > 1 ? (
          <>
            <SectionTitle title={t("member.family")} />
            {family.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => m.id !== member?.id && switchMember(m.id)}
                style={[
                  styles.familyRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  m.id === member?.id && { borderColor: accent, backgroundColor: colors.bg },
                ]}
              >
                <Text style={[styles.familyName, { color: colors.text }]}>{m.name}</Text>
                {m.id === member?.id ? <Text style={[styles.activeTag, { color: accent }]}>{t("member.active")}</Text> : null}
              </Pressable>
            ))}
          </>
        ) : null}

        <PrimaryButton label={t("member.browseAll")} variant="outline" icon="compass" onPress={() => router.push("/(discover)")} />
        <PrimaryButton label={t("account.switchClub")} variant="outline" onPress={onSwitchClub} />
        <PrimaryButton label={t("account.signOut")} variant="danger" onPress={onLogout} />
        <Text style={[styles.version, { color: colors.textMuted }]}>{t("app.name")}</Text>
      </Screen>

      <Modal visible={qrOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setQrOpen(false)}>
        <View style={[styles.qrModal, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.qrHeading}>{t("member.checkInQr")}</Text>
          <Text style={styles.qrHint}>{t("member.qrHint")}</Text>
          <QrIllustration size={120} />
          {loadingQr ? (
            <Skeleton height={220} style={{ width: 220 }} />
          ) : qr?.checkInUrl ? (
            <View style={styles.qrBox}>
              <QRCode value={qr.checkInUrl} size={240} backgroundColor="#fff" />
            </View>
          ) : null}
          <PrimaryButton label={t("common.close")} onPress={() => setQrOpen(false)} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 6 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 18, fontWeight: "700" },
  meta: { fontSize: 14 },
  beltRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  beltDot: { width: 14, height: 14, borderRadius: 7 },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  familyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  familyName: { fontSize: 16, fontWeight: "600" },
  activeTag: { fontSize: 12, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 12, marginTop: 8 },
  qrModal: { flex: 1, backgroundColor: "#0f172a", paddingHorizontal: spacing.lg, alignItems: "center", justifyContent: "center", gap: 16 },
  qrHeading: { color: "#fff", fontSize: 24, fontWeight: "800" },
  qrHint: { color: "#94a3b8", fontSize: 14 },
  qrBox: { backgroundColor: "#fff", padding: 20, borderRadius: 20 },
});
