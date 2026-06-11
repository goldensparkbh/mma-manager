import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, Screen, StaffHeader } from "@/lib/components";
import { useClubTypes } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { registerClub } = useAuth();
  const { data: clubTypes = [] } = useClubTypes();
  const [form, setForm] = useState({
    clubName: "",
    adminName: "",
    email: "",
    phone: "",
    password: "",
    clubType: "hybrid",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await registerClub({
        clubName: form.clubName.trim(),
        adminName: form.adminName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        clubType: form.clubType,
      });
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <Screen scroll>
        <StaffHeader title="Start free" subtitle="Manage members, classes & check-ins — no credit card" />
        <Card>
          <Text style={styles.note}>Free forever for core club management. Upgrade on the web when you need finance, store & analytics.</Text>
          <Field label="Club name" value={form.clubName} onChangeText={(v) => setForm({ ...form, clubName: v })} />
          <Field label="Your name" value={form.adminName} onChangeText={(v) => setForm({ ...form, adminName: v })} />
          <Field label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Phone (optional)" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
          <Field label="Password" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry />
          <Text style={styles.label}>Club type</Text>
          <View style={styles.chips}>
            {clubTypes.slice(0, 8).map((ct) => (
              <Pressable
                key={ct.id}
                onPress={() => setForm({ ...form, clubType: ct.id })}
                style={[styles.chip, form.clubType === ct.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, form.clubType === ct.id && styles.chipTextActive]}>{ct.label}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton label="Create free club" loading={loading} onPress={submit} disabled={!form.clubName || !form.email || form.password.length < 6} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={styles.link}>Already have an account? Sign in</Text>
          </Pressable>
        </Card>
      </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: "none";
  keyboardType?: "email-address" | "phone-pad";
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 19 },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 10, fontWeight: "600", textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.bg, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  chipActive: { borderColor: colors.primary, backgroundColor: "rgba(59,130,246,0.15)" },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: colors.primary },
  error: { color: colors.danger, marginTop: 8, textAlign: "center" },
  link: { color: colors.primary, textAlign: "center", fontWeight: "600" },
});
