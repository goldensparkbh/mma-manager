import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Card, PrimaryButton, Screen, StaffHeader } from "@/lib/components";
import { colors, spacing } from "@/lib/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, tenant, logout } = useAuth();

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
      <PrimaryButton label="Sign out" variant="danger" onPress={onLogout} />
      <Text style={styles.version}>Nawady Staff</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textMuted, marginTop: 12, fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 17, fontWeight: "600", color: colors.text, marginTop: 2 },
  version: { textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: spacing.lg },
});
