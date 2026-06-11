import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { PrimaryButton } from "@/lib/components";
import { DashboardIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import { useI18n } from "@/lib/i18n";
import { colors, radius, spacing } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useI18n();
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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#1e3a8a", "#0f172a"]} style={styles.hero}>
        <Text style={styles.brand}>{t("login.brand")}</Text>
        <Text style={styles.sub}>Scan, schedule, and manage your club on the go</Text>
      </LinearGradient>
      <View style={styles.card}>
        <FadeInView>
          <View style={styles.illus}>
            <DashboardIllustration size={160} />
          </View>
        </FadeInView>
        <TextInput style={styles.input} placeholder={t("login.email")} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholderTextColor={colors.textMuted} />
        <TextInput style={styles.input} placeholder={t("login.password")} secureTextEntry value={password} onChangeText={setPassword} placeholderTextColor={colors.textMuted} />
        <PrimaryButton label={t("login.signIn")} loading={loading} disabled={!email || !password} onPress={onSubmit} />
        <Pressable onPress={() => router.push("/register")} style={{ marginTop: 8 }}>
          <Text style={styles.registerLink}>New club? Create a free account</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingTop: 80, paddingBottom: 40, paddingHorizontal: spacing.lg },
  brand: { fontSize: 32, fontWeight: "800", color: "#fff" },
  sub: { fontSize: 15, color: "#94a3b8", marginTop: 10 },
  card: { flex: 1, marginTop: -20, backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 16, color: colors.text, backgroundColor: colors.bg },
  error: { color: colors.danger, textAlign: "center" },
  registerLink: { color: colors.primary, textAlign: "center", fontWeight: "600", fontSize: 14 },
  illus: { alignItems: "center", marginBottom: 8 },
});
