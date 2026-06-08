import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, tenant, logout } = useAuth();

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Club</Text>
        <Text style={styles.value}>{tenant?.name}</Text>
        <Text style={styles.label}>Account</Text>
        <Text style={styles.value}>{user?.displayName || user?.email}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>Role: {user?.role}</Text>
      </View>

      <Pressable style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0f172a" },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  label: { fontSize: 12, color: "#64748b", marginTop: 12 },
  value: { fontSize: 18, fontWeight: "600", color: "#fff", marginTop: 2 },
  meta: { fontSize: 14, color: "#94a3b8", marginTop: 6 },
  logout: {
    marginTop: 32,
    backgroundColor: "#7f1d1d",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "#fecaca", fontWeight: "600" },
});
