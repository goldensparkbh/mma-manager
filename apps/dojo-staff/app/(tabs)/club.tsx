import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Card, MenuRow, PrimaryButton, Screen, StaffHeader, UpgradeBanner } from "@/lib/components";
import { useClubSettings } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { openWebDashboard } from "@/lib/plan";
import { colors, spacing } from "@/lib/theme";

export default function ClubScreen() {
  const router = useRouter();
  const { user, tenant, subscription, planLimits, logout, isFreePlan } = useAuth();
  const { data: settings } = useClubSettings();
  const { t, locale, setLocale } = useI18n();

  const logo = settings?.logoUrlDark || settings?.logoUrlLight;
  const planName = subscription?.planName || (isFreePlan ? "Free" : "—");

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Screen scroll>
      <StaffHeader title="My club" subtitle="Profile, packages & team" tenantName={tenant?.name} />
      {isFreePlan ? <UpgradeBanner /> : null}

      <Card>
        <View style={styles.clubRow}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logo} contentFit="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoLetter}>{tenant?.name?.[0] || "C"}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.clubName}>{settings?.name || tenant?.name}</Text>
            <Text style={styles.planBadge}>{planName} plan</Text>
            {planLimits ? (
              <Text style={styles.limits}>
                Up to {planLimits.maxMembers} members · {planLimits.maxUsers} staff
              </Text>
            ) : null}
          </View>
        </View>
      </Card>

      <Card style={{ paddingVertical: 0, paddingHorizontal: spacing.md }}>
        <MenuRow icon="settings-outline" label="Club profile & logo" subtitle="Name, contact, branding" onPress={() => router.push("/settings")} />
        <MenuRow icon="pricetag-outline" label="Member packages" subtitle="Plans members can buy" onPress={() => router.push("/packages")} />
        <MenuRow icon="calendar-outline" label="Class registrations" subtitle="Who booked upcoming classes" onPress={() => router.push("/registrations")} />
        <MenuRow icon="people-outline" label="Staff team" subtitle="Invite coaches & staff" onPress={() => router.push("/team")} badge={planLimits ? `${planLimits.maxUsers} max` : undefined} />
        <MenuRow icon="globe-outline" label="Full web dashboard" subtitle="Finance, store, analytics…" onPress={() => openWebDashboard("/")} />
      </Card>

      <Card>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.displayName || user?.email}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{user?.role}</Text>
      </Card>

      <Card>
        <Pressable onPress={() => setLocale(locale === "en" ? "ar" : "en")} style={styles.langRow}>
          <Text style={styles.value}>{t("profile.language")}</Text>
          <Text style={[styles.value, { color: colors.primary }]}>{locale === "ar" ? "العربية" : "English"}</Text>
        </Pressable>
      </Card>

      <PrimaryButton label={t("profile.signOut")} variant="danger" onPress={onLogout} />
      <Text style={styles.version}>{t("app.name")}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  clubRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  logo: { width: 56, height: 56, borderRadius: 14 },
  logoPlaceholder: { width: 56, height: 56, borderRadius: 14, backgroundColor: "rgba(59,130,246,0.15)", alignItems: "center", justifyContent: "center" },
  logoLetter: { fontSize: 24, fontWeight: "800", color: colors.primary },
  clubName: { fontSize: 18, fontWeight: "800", color: colors.text },
  planBadge: { fontSize: 12, fontWeight: "700", color: colors.primary, marginTop: 4, textTransform: "uppercase" },
  limits: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 12, fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 17, fontWeight: "600", color: colors.text, marginTop: 2 },
  version: { textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: spacing.lg },
  langRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
});
