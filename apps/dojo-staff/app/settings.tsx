import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { Card, PrimaryButton, Screen, StaffHeader, UpgradeBanner } from "@/lib/components";
import { useClubSettings, useUpdateClubSettings } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";

export default function SettingsScreen() {
  const { isFreePlan } = useAuth();
  const { data: settings, isLoading } = useClubSettings();
  const update = useUpdateClubSettings();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [welcome, setWelcome] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (settings && !initialized) {
      setName(settings.name || "");
      setPhone(settings.phone || "");
      setLocation(settings.location || "");
      setWelcome(settings.portalWelcomeMessage || settings.welcomeMessage || "");
      setInitialized(true);
    }
  }, [settings, initialized]);

  const save = async () => {
    await update.mutateAsync({ name, phone, location, portalWelcomeMessage: welcome });
  };

  return (
      <Screen scroll>
        <StaffHeader title="Club profile" subtitle="Logo & contact info sync to member app" />
        {isFreePlan ? <UpgradeBanner compact /> : null}
        <Card>
          <Text style={styles.label}>Club name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>Welcome message</Text>
          <TextInput style={[styles.input, styles.multiline]} value={welcome} onChangeText={setWelcome} multiline placeholderTextColor={colors.textMuted} />
          <Text style={styles.hint}>Upload logo from the web dashboard → Settings → Branding</Text>
          <PrimaryButton label={update.isPending ? "Saving…" : "Save changes"} onPress={save} loading={update.isPending} disabled={isLoading} />
        </Card>
      </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textMuted, marginTop: 10, fontWeight: "600", textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.bg, marginTop: 4 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.md, lineHeight: 17 },
});
