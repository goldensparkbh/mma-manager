import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { PrimaryButton } from "@/lib/components";
import { useI18n } from "@/lib/i18n";
import { resolveImageUrl } from "@/lib/resolveUrl";
import { radius, spacing, useThemeColors, withAlpha } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { clubName, login, requestOtp, loginWithOtp, portalInfo, loading, member } = useAuth();
  const { t } = useI18n();
  const colors = useThemeColors();
  const accent = portalInfo?.primaryColor || colors.primary;

  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && member) router.replace("/(member)");
  }, [loading, member, router]);

  const run = async (fn: () => Promise<void>) => {
    setSubmitting(true);
    setError("");
    try {
      await fn();
      router.replace("/(member)");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={[accent, withAlpha(accent, 0.9)]} style={styles.hero}>
        {resolveImageUrl(portalInfo?.logoUrl) ? (
          <Image source={{ uri: resolveImageUrl(portalInfo?.logoUrl)! }} style={styles.logo} contentFit="contain" />
        ) : null}
        <Text style={styles.heroTitle}>{clubName || t("login.title")}</Text>
        <Text style={styles.heroSub}>{t("login.subtitle")}</Text>
      </LinearGradient>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={[styles.tabs, { backgroundColor: colors.bg }]}>
          {(["otp", "password"] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, mode === m && { backgroundColor: accent }]}>
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>{m === "otp" ? t("login.otp") : t("login.password")}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
          placeholder={t("login.phone")}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholderTextColor={colors.textMuted}
        />

        {mode === "password" ? (
          <>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
              placeholder={t("login.password")}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={colors.textMuted}
            />
            <PrimaryButton label={t("login.signIn")} loading={submitting} disabled={!phone || !password} onPress={() => run(() => login(phone, password))} />
          </>
        ) : !otpSent ? (
          <PrimaryButton
            label={t("login.sendCode")}
            loading={submitting}
            disabled={!phone}
            onPress={async () => {
              setSubmitting(true);
              setError("");
              try {
                await requestOtp(phone);
                setOtpSent(true);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setSubmitting(false);
              }
            }}
          />
        ) : (
          <>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
              placeholder="6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              placeholderTextColor={colors.textMuted}
            />
            <PrimaryButton label={t("login.verify")} loading={submitting} disabled={code.length < 6} onPress={() => run(() => loginWithOtp(phone, code))} />
          </>
        )}

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <Pressable onPress={() => router.replace("/(discover)/clubs")}>
          <Text style={[styles.link, { color: accent }]}>{t("login.browseOther")}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingTop: 72, paddingBottom: 36, paddingHorizontal: spacing.lg, alignItems: "center" },
  logo: { width: 72, height: 72, borderRadius: 18, backgroundColor: "#fff", marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#fff", textAlign: "center" },
  heroSub: { fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 8, textAlign: "center" },
  card: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: 12,
  },
  tabs: { flexDirection: "row", borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: "center" },
  tabText: { color: "#64748b", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
  },
  error: { textAlign: "center", fontSize: 14 },
  link: { textAlign: "center", marginTop: 8, fontWeight: "600" },
});
