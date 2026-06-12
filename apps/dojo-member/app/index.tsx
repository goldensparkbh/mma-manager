import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import * as storage from "@/lib/storage";
import { useThemeColors } from "@/lib/theme";

export default function BootstrapScreen() {
  const router = useRouter();
  const { loading, member, slug } = useAuth();
  const colors = useThemeColors();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    storage.isOnboardingComplete().then(() => setOnboardingChecked(true));
  }, []);

  useEffect(() => {
    if (loading || !onboardingChecked) return;
    (async () => {
      const done = await storage.isOnboardingComplete();
      if (!done) {
        router.replace("/onboarding");
        return;
      }
      if (member && slug) {
        router.replace("/(member)");
        return;
      }
      router.replace("/login");
    })();
  }, [loading, member, slug, router, onboardingChecked]);

  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
