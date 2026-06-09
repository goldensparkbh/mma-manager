import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function BootstrapScreen() {
  const router = useRouter();
  const { loading, member, slug } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (member && slug) {
      router.replace("/(member)");
      return;
    }
    router.replace("/(discover)");
  }, [loading, member, slug, router]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
