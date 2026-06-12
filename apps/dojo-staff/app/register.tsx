import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, Screen, StaffHeader } from "@/lib/components";
import { useClubTypes } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { useTypography } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { radius, spacing, useThemeColors, withAlpha } from "@/lib/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { registerClub } = useAuth();
  const { data: clubTypes = [] } = useClubTypes();
  const { t, clubTypeName } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
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
      <StaffHeader title={t("register.title")} subtitle={t("register.subtitle")} />
      <Card>
        <Text style={[styles.note, { color: colors.textMuted }, typo.style("regular")]}>{t("register.note")}</Text>
        <Field label={t("register.clubName")} value={form.clubName} onChangeText={(v) => setForm({ ...form, clubName: v })} />
        <Field label={t("register.yourName")} value={form.adminName} onChangeText={(v) => setForm({ ...form, adminName: v })} />
        <Field label={t("register.email")} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} autoCapitalize="none" keyboardType="email-address" />
        <Field label={t("register.phone")} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
        <Field label={t("register.password")} value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry />
        <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{t("register.clubType")}</Text>
        <View style={[styles.chips, typo.row]}>
          {clubTypes.slice(0, 8).map((ct) => (
            <Pressable
              key={ct.id}
              onPress={() => setForm({ ...form, clubType: ct.id })}
              style={[
                styles.chip,
                { borderColor: colors.border },
                form.clubType === ct.id && { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.15) },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.textMuted },
                  typo.style("semibold"),
                  form.clubType === ct.id && { color: colors.primary },
                ]}
              >
                {clubTypeName(ct.nameEn, ct.nameAr)}
              </Text>
            </Pressable>
          ))}
        </View>
        <PrimaryButton label={t("register.submit")} loading={loading} onPress={submit} disabled={!form.clubName || !form.email || form.password.length < 6} />
        {error ? <Text style={[styles.error, { color: colors.danger }, typo.style("regular")]}>{error}</Text> : null}
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={[styles.link, { color: colors.primary }, typo.style("semibold")]}>{t("register.signIn")}</Text>
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
  const colors = useThemeColors();
  const typo = useTypography();

  return (
    <>
      <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{label}</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }, typo.style("regular")]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        textAlign={typo.isRtl ? "right" : "left"}
      />
    </>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, marginBottom: spacing.md, lineHeight: 19 },
  label: { fontSize: 12, marginTop: 10, fontWeight: "600", textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: radius.md, padding: 12, fontSize: 16, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
  error: { marginTop: 8, textAlign: "center" },
  link: { textAlign: "center", fontWeight: "600" },
});
