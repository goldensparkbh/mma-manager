import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { DiscoverIllustration } from "@/lib/illustrations";
import { PrimaryButton } from "@/lib/components";
import { useI18n } from "@/lib/i18n";
import * as storage from "@/lib/storage";
import { spacing } from "@/lib/theme";

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useI18n();

  const finish = async (path: "/(discover)" | "/(discover)/clubs") => {
    await storage.setOnboardingComplete();
    router.replace(path);
  };

  return (
    <LinearGradient colors={["#0f172a", "#1e3a5f"]} style={styles.root}>
      <Text style={styles.brand}>{t("platform.brand")}</Text>
      <DiscoverIllustration size={260} />
      <Text style={styles.title}>{t("onboarding.welcome")}</Text>
      <Text style={styles.sub}>{t("onboarding.subtitle")}</Text>
      <View style={styles.actions}>
        <PrimaryButton label={t("onboarding.browse")} icon="compass" onPress={() => finish("/(discover)/clubs")} />
        <PrimaryButton label={t("onboarding.signIn")} variant="outline" icon="log-in" onPress={() => finish("/(discover)/clubs")} />
        <PrimaryButton label={t("onboarding.skip")} variant="outline" onPress={() => finish("/(discover)")} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 72, paddingBottom: 40, alignItems: "center", gap: 16 },
  brand: { fontSize: 13, fontWeight: "800", color: "#60a5fa", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", textAlign: "center" },
  sub: { fontSize: 16, color: "#94a3b8", textAlign: "center", lineHeight: 24 },
  actions: { width: "100%", gap: 10, marginTop: 12 },
});
