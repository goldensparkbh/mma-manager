import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { Card, PrimaryButton, Screen, StaffHeader, UpgradeBanner } from "@/lib/components";
import { useTypography } from "@/lib/fonts";
import { useInviteStaff, useStaffUsers } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { radius, useThemeColors } from "@/lib/theme";

export default function TeamScreen() {
  const { planLimits, isFreePlan } = useAuth();
  const { t } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
  const { data: users = [], refetch, isRefetching } = useStaffUsers();
  const invite = useInviteStaff();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    try {
      await invite.mutateAsync({ email: email.trim(), name: name.trim(), password, role: "staff" });
      setEmail("");
      setName("");
      setPassword("");
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const inputStyle = {
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.bg,
    textAlign: typo.isRtl ? ("right" as const) : ("left" as const),
  };

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => refetch()}>
      <StaffHeader
        title={t("team.title")}
        subtitle={
          planLimits
            ? t("team.subtitle", { count: users.length, max: planLimits.maxUsers })
            : undefined
        }
      />
      {isFreePlan ? <UpgradeBanner compact /> : null}
      <Card>
        <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{t("team.invite")}</Text>
        <TextInput style={[styles.input, inputStyle, typo.style("regular")]} placeholder={t("team.name")} placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
        <TextInput style={[styles.input, inputStyle, typo.style("regular")]} placeholder={t("team.email")} placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={[styles.input, inputStyle, typo.style("regular")]} placeholder={t("team.tempPassword")} placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
        <PrimaryButton label={t("team.submit")} onPress={submit} loading={invite.isPending} />
        {error ? <Text style={[styles.error, { color: colors.danger }, typo.style("regular")]}>{error}</Text> : null}
      </Card>
      {users.map((u) => (
        <Card key={u.id}>
          <Text style={[styles.userName, { color: colors.text }, typo.style("bold")]}>{u.displayName || u.email}</Text>
          <Text style={[styles.userMeta, { color: colors.textMuted }, typo.style("regular")]}>{u.email} · {u.role}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: radius.md, padding: 12, fontSize: 16, marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: "700" },
  userMeta: { fontSize: 13, marginTop: 4 },
  error: { marginTop: 8, textAlign: "center" },
});
