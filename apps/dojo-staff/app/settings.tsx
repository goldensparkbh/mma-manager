import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { Card, PrimaryButton, Screen, StaffHeader, UpgradeBanner } from "@/lib/components";
import { useTypography } from "@/lib/fonts";
import { openWebDashboard } from "@/lib/plan";
import { useClubSettings, useUpdateClubSettings } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { radius, spacing, useThemeColors } from "@/lib/theme";

export default function SettingsScreen() {
  const { isFreePlan } = useAuth();
  const { t } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
  const { data: settings, isLoading } = useClubSettings();
  const update = useUpdateClubSettings();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [welcome, setWelcome] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (settings && !initialized) {
      setName(settings.name || "");
      setPhone(settings.phone || "");
      setLocation(settings.location || "");
      setWelcome(settings.portalWelcomeMessage || settings.welcomeMessage || "");
      setInitialized(true);
    }
  }, [settings, initialized]);

  const save = async () => {
    await update.mutateAsync({ name, phone, location, portalWelcomeMessage: welcome });
  };

  return (
    <Screen scroll>
      <StaffHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      {isFreePlan ? <UpgradeBanner compact /> : null}
      <Card>
        <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{t("settings.clubName")}</Text>
        <TextInput style={[styles.input, inputStyle(colors, typo)]} value={name} onChangeText={setName} placeholderTextColor={colors.textMuted} />
        <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{t("settings.phone")}</Text>
        <TextInput style={[styles.input, inputStyle(colors, typo)]} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />
        <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{t("settings.location")}</Text>
        <TextInput style={[styles.input, inputStyle(colors, typo)]} value={location} onChangeText={setLocation} placeholderTextColor={colors.textMuted} />
        <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{t("settings.welcome")}</Text>
        <TextInput style={[styles.input, styles.multiline, inputStyle(colors, typo)]} value={welcome} onChangeText={setWelcome} multiline placeholderTextColor={colors.textMuted} />
        <Text style={[styles.hint, { color: colors.textMuted }, typo.style("regular")]}>{t("settings.logoHint")}</Text>
        <PrimaryButton label={t("settings.uploadLogo")} variant="outline" onPress={() => openWebDashboard("/system-settings")} />
        <PrimaryButton
          label={update.isPending ? t("settings.saving") : t("settings.save")}
          onPress={save}
          loading={update.isPending}
          disabled={isLoading}
        />
      </Card>
    </Screen>
  );
}

function inputStyle(colors: ReturnType<typeof useThemeColors>, typo: ReturnType<typeof useTypography>) {
  return {
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.bg,
    textAlign: typo.isRtl ? ("right" as const) : ("left" as const),
  };
}

const styles = StyleSheet.create({
  label: { fontSize: 12, marginTop: 10, fontWeight: "600", textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: radius.md, padding: 12, fontSize: 16, marginTop: 4 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  hint: { fontSize: 12, marginTop: spacing.md, lineHeight: 17 },
});
