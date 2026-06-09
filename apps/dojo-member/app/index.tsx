import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { PrimaryButton } from "@/lib/components";
import { ClassesIllustration } from "@/lib/illustrations";
import { FadeInSoft } from "@/lib/motion";
import { colors, radius, spacing } from "@/lib/theme";

export default function ClubSelectScreen() {
  const router = useRouter();
  const { loading, slug, member, setSlug, clubName, portalInfo } = useAuth();
  const [input, setInput] = useState(slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const accent = portalInfo?.primaryColor || colors.primary;

  useEffect(() => {
    if (loading) return;
    if (member && slug) {
      router.replace("/(tabs)");
      return;
    }
    if (slug && !member) router.replace("/login");
  }, [loading, member, slug, router]);

  const onContinue = async () => {
    if (!input.trim()) return;
    setSaving(true);
    setError("");
    try {
      await setSlug(input.trim());
      router.push("/login");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.hero}>
        <Text style={styles.brand}>Dojo Member</Text>
        <Text style={styles.sub}>Your club in your pocket — book, pay, check in</Text>
      </LinearGradient>
      <View style={styles.card}>
        <FadeInSoft>
          <View style={styles.illusWrap}>
            <ClassesIllustration size={180} />
          </View>
        </FadeInSoft>
        <Text style={styles.title}>Enter club code</Text>
        <Text style={styles.hint}>Same code as your portal link (e.g. parkour)</Text>
        <TextInput
          style={styles.input}
          placeholder="club-code"
          autoCapitalize="none"
          autoCorrect={false}
          value={input}
          onChangeText={setInput}
          placeholderTextColor={colors.textMuted}
        />
        {clubName ? <Text style={[styles.found, { color: accent }]}>✓ {clubName}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={saving ? "Connecting…" : "Continue"} disabled={saving || !input.trim()} onPress={onContinue} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingTop: 80, paddingBottom: 48, paddingHorizontal: spacing.lg },
  brand: { fontSize: 32, fontWeight: "800", color: "#fff" },
  sub: { fontSize: 15, color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  card: {
    flex: 1,
    marginTop: -24,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  hint: { fontSize: 14, color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  found: { fontWeight: "600" },
  error: { color: colors.danger, textAlign: "center" },
  illusWrap: { alignItems: "center", marginBottom: 8 },
});
