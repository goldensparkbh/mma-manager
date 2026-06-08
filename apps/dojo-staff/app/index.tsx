import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function IndexScreen() {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/(tabs)/scan" : "/login");
  }, [loading, user, router]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
});
