import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { PrimaryButton } from "@/lib/components";
import { DashboardIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import { useTypography } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { NAWADY_BRAND } from "@/lib/brand";
import { radius, spacing, useThemeColors } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={[NAWADY_BRAND.primary, NAWADY_BRAND.primaryDark, NAWADY_BRAND.primaryDarker]} style={styles.hero}>
        <Text style={[styles.brand, typo.style("bold")]}>{t("login.brand")}</Text>
        <Text style={[styles.sub, typo.style("regular")]}>{t("login.subtitle")}</Text>
      </LinearGradient>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <FadeInView>
          <View style={styles.illus}>
            <DashboardIllustration size={160} />
          </View>
        </FadeInView>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }, typo.style("regular")]}
          placeholder={t("login.email")}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor={colors.textMuted}
          textAlign={typo.isRtl ? "right" : "left"}
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }, typo.style("regular")]}
          placeholder={t("login.password")}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor={colors.textMuted}
          textAlign={typo.isRtl ? "right" : "left"}
        />
        <PrimaryButton label={t("login.signIn")} loading={loading} disabled={!email || !password} onPress={onSubmit} />
        <Pressable onPress={() => router.push("/register")} style={{ marginTop: 8 }}>
          <Text style={[styles.registerLink, { color: colors.primary }, typo.style("semibold")]}>{t("login.register")}</Text>
        </Pressable>
        {error ? <Text style={[styles.error, { color: colors.danger }, typo.style("regular")]}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingTop: 80, paddingBottom: 40, paddingHorizontal: spacing.lg },
  brand: { fontSize: 32, fontWeight: "800", color: "#fff" },
  sub: { fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 10 },
  card: { flex: 1, marginTop: -20, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: 12 },
  input: { borderWidth: 1, borderRadius: radius.md, padding: 14, fontSize: 16 },
  error: { textAlign: "center" },
  registerLink: { textAlign: "center", fontWeight: "600", fontSize: 14 },
  illus: { alignItems: "center", marginBottom: 8 },
});
