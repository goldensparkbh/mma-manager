import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAuth } from "@/lib/auth";
import { Card, PrimaryButton, Screen, StaffHeader } from "@/lib/components";
import { useI18n } from "@/lib/i18n";
import { colors, spacing } from "@/lib/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, tenant, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Screen scroll>
      <StaffHeader title="Account" tenantName={tenant?.name} />
      <Card>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.displayName || "—"}</Text>
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
  label: { fontSize: 12, color: colors.textMuted, marginTop: 12, fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 17, fontWeight: "600", color: colors.text, marginTop: 2 },
  version: { textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: spacing.lg },
  langRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
});
