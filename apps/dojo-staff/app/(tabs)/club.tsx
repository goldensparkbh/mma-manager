import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Card, MenuRow, PrimaryButton, Screen, StaffHeader, UpgradeBanner } from "@/lib/components";
import { useTypography } from "@/lib/fonts";
import { useClubSettings } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { openWebDashboard } from "@/lib/plan";
import { spacing, useTheme, useThemeColors, withAlpha, type ThemeMode } from "@/lib/theme";

export default function ClubScreen() {
  const router = useRouter();
  const { user, tenant, subscription, planLimits, logout, isFreePlan } = useAuth();
  const { data: settings } = useClubSettings();
  const { t, locale, setLocale } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
  const { mode, setMode } = useTheme();

  const logo = settings?.logoUrlDark || settings?.logoUrlLight;
  const planName = subscription?.planName || (isFreePlan ? t("club.freePlan") : "—");

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const cycleTheme = async () => {
    const order: ThemeMode[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    await setMode(next);
  };

  const themeLabel =
    mode === "system" ? t("profile.themeSystem") : mode === "light" ? t("profile.themeLight") : t("profile.themeDark");

  return (
    <Screen scroll>
      <StaffHeader title={t("club.title")} subtitle={t("club.subtitle")} tenantName={tenant?.name} />
      {isFreePlan ? <UpgradeBanner /> : null}

      <Card>
        <View style={[styles.clubRow, typo.row]}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logo} contentFit="contain" />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: withAlpha(colors.primary, 0.15) }]}>
              <Text style={[styles.logoLetter, { color: colors.primary }, typo.style("bold")]}>{tenant?.name?.[0] || "C"}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.clubName, { color: colors.text }, typo.style("bold")]}>{settings?.name || tenant?.name}</Text>
            <Text style={[styles.planBadge, { color: colors.primary }, typo.style("bold")]}>{t("club.planLabel", { plan: planName })}</Text>
            {planLimits ? (
              <Text style={[styles.limits, { color: colors.textMuted }, typo.style("regular")]}>
                {t("club.limits", { members: planLimits.maxMembers, staff: planLimits.maxUsers })}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>

      <Card style={{ paddingVertical: 0, paddingHorizontal: spacing.md }}>
        <MenuRow icon="settings-outline" label={t("club.menuProfile")} subtitle={t("club.menuProfileSub")} onPress={() => router.push("/settings")} />
        <MenuRow icon="pricetag-outline" label={t("club.menuPackages")} subtitle={t("club.menuPackagesSub")} onPress={() => router.push("/packages")} />
        <MenuRow icon="calendar-outline" label={t("club.menuRegistrations")} subtitle={t("club.menuRegistrationsSub")} onPress={() => router.push("/registrations")} />
        <MenuRow
          icon="people-outline"
          label={t("club.menuTeam")}
          subtitle={t("club.menuTeamSub")}
          onPress={() => router.push("/team")}
          badge={planLimits ? t("club.maxBadge", { count: planLimits.maxUsers }) : undefined}
        />
        <MenuRow icon="globe-outline" label={t("club.menuWeb")} subtitle={t("club.menuWebSub")} onPress={() => openWebDashboard("/")} />
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{t("club.signedInAs")}</Text>
        <Text style={[styles.value, { color: colors.text }, typo.style("semibold")]}>{user?.displayName || user?.email}</Text>
        <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{t("club.email")}</Text>
        <Text style={[styles.value, { color: colors.text }, typo.style("semibold")]}>{user?.email}</Text>
        <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{t("club.role")}</Text>
        <Text style={[styles.value, { color: colors.text }, typo.style("semibold")]}>{user?.role}</Text>
      </Card>

      <Card>
        <Pressable onPress={() => setLocale(locale === "en" ? "ar" : "en")} style={[styles.langRow, typo.row]}>
          <Text style={[styles.value, { color: colors.text }, typo.style("semibold")]}>{t("profile.language")}</Text>
          <Text style={[styles.value, { color: colors.primary }, typo.style("semibold")]}>{locale === "ar" ? "العربية" : "English"}</Text>
        </Pressable>
        <Pressable onPress={cycleTheme} style={[styles.langRow, typo.row]}>
          <Text style={[styles.value, { color: colors.text }, typo.style("semibold")]}>{t("profile.theme")}</Text>
          <Text style={[styles.value, { color: colors.primary }, typo.style("semibold")]}>{themeLabel}</Text>
        </Pressable>
      </Card>

      <PrimaryButton label={t("profile.signOut")} variant="danger" onPress={onLogout} />
      <Text style={[styles.version, { color: colors.textMuted }, typo.style("regular")]}>{t("app.name")}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  clubRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  logo: { width: 56, height: 56, borderRadius: 14 },
  logoPlaceholder: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  logoLetter: { fontSize: 24, fontWeight: "800" },
  clubName: { fontSize: 18, fontWeight: "800" },
  planBadge: { fontSize: 12, fontWeight: "700", marginTop: 4, textTransform: "uppercase" },
  limits: { fontSize: 12, marginTop: 4 },
  label: { fontSize: 12, marginTop: 12, fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 17, fontWeight: "600", marginTop: 2 },
  version: { textAlign: "center", fontSize: 12, marginTop: spacing.lg },
  langRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
});
