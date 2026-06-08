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

export default function ClubSelectScreen() {
  const router = useRouter();
  const { loading, slug, member, setSlug, clubName } = useAuth();
  const [input, setInput] = useState(slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (member && slug) {
      router.replace("/(tabs)");
      return;
    }
    if (slug && !member) {
      router.replace("/login");
    }
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
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Dojo Member</Text>
      <Text style={styles.subtitle}>Enter your club code to get started</Text>
      <TextInput
        style={styles.input}
        placeholder="club-slug"
        autoCapitalize="none"
        autoCorrect={false}
        value={input}
        onChangeText={setInput}
      />
      {clubName ? <Text style={styles.hint}>Club: {clubName}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={onContinue} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "..." : "Continue"}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" },
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f8fafc" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 8, marginBottom: 24 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  hint: { color: "#3b82f6", marginBottom: 8, textAlign: "center" },
  error: { color: "#dc2626", marginBottom: 8, textAlign: "center" },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
