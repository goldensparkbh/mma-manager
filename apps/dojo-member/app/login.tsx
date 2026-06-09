import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { colors, radius, spacing, withAlpha } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { clubName, login, requestOtp, loginWithOtp, portalInfo, loading, member, slug } = useAuth();
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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={[accent, withAlpha(accent, 0.9)]} style={styles.hero}>
        <Text style={styles.heroTitle}>{clubName || "Member login"}</Text>
        <Text style={styles.heroSub}>Sign in to book classes and check in</Text>
      </LinearGradient>

      <View style={styles.card}>
        <View style={styles.tabs}>
          {(["otp", "password"] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, mode === m && { backgroundColor: accent }]}>
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>{m === "otp" ? "OTP" : "Password"}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput style={styles.input} placeholder="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholderTextColor={colors.textMuted} />

        {mode === "password" ? (
          <>
            <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} placeholderTextColor={colors.textMuted} />
            <PrimaryButton label="Sign in" loading={submitting} disabled={!phone || !password} onPress={() => run(() => login(phone, password))} />
          </>
        ) : !otpSent ? (
          <PrimaryButton
            label="Send code"
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
            <TextInput style={styles.input} placeholder="6-digit code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} placeholderTextColor={colors.textMuted} />
            <PrimaryButton label="Verify" loading={submitting} disabled={code.length < 6} onPress={() => run(() => loginWithOtp(phone, code))} />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={() => router.replace("/(discover)/clubs")}>
          <Text style={[styles.link, { color: accent }]}>Browse other clubs</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingTop: 72, paddingBottom: 36, paddingHorizontal: spacing.lg },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 8 },
  card: {
    flex: 1,
    marginTop: -20,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: 12,
  },
  tabs: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: "center" },
  tabText: { color: colors.textMuted, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  error: { color: colors.danger, textAlign: "center", fontSize: 14 },
  link: { textAlign: "center", marginTop: 8, fontWeight: "600" },
});
