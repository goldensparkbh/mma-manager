import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, Screen, StaffHeader } from "@/lib/components";
import { useTypography } from "@/lib/fonts";
import { usePackages, useSavePackage } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { radius, spacing, useThemeColors } from "@/lib/theme";

export default function PackagesScreen() {
  const { t } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
  const { data: packages = [], refetch, isRefetching } = usePackages();
  const save = useSavePackage();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("30");

  const addPackage = async () => {
    if (!name.trim()) return;
    await save.mutateAsync({
      name: name.trim(),
      price: Number(price) || 0,
      duration: Number(duration) || 30,
      packageType: "subscription",
    });
    setName("");
    setPrice("");
    await refetch();
  };

  const inputStyle = {
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.bg,
    textAlign: typo.isRtl ? ("right" as const) : ("left" as const),
  };

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => refetch()}>
      <StaffHeader title={t("packages.title")} subtitle={t("packages.subtitle")} />
      <Card>
        <Text style={[styles.label, { color: colors.textMuted }, typo.style("semibold")]}>{t("packages.add")}</Text>
        <TextInput style={[styles.input, inputStyle, typo.style("regular")]} placeholder={t("packages.name")} placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
        <View style={[styles.row, typo.row]}>
          <TextInput style={[styles.input, { flex: 1 }, inputStyle, typo.style("regular")]} placeholder={t("packages.price")} placeholderTextColor={colors.textMuted} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <TextInput style={[styles.input, { flex: 1 }, inputStyle, typo.style("regular")]} placeholder={t("packages.days")} placeholderTextColor={colors.textMuted} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        </View>
        <PrimaryButton label={t("packages.submit")} onPress={addPackage} loading={save.isPending} />
      </Card>
      {packages.map((pkg) => (
        <Card key={pkg.id}>
          <Text style={[styles.pkgName, { color: colors.text }, typo.style("bold")]}>{pkg.name}</Text>
          <Text style={[styles.pkgMeta, { color: colors.textMuted }, typo.style("regular")]}>
            {t("packages.meta", { price: pkg.price, days: pkg.duration })}
            {pkg.packageType ? ` · ${pkg.packageType}` : ""}
          </Text>
        </Card>
      ))}
      {!packages.length ? (
        <Text style={[styles.empty, { color: colors.textMuted }, typo.style("regular")]}>{t("packages.empty")}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: radius.md, padding: 12, fontSize: 16, marginBottom: 8 },
  row: { flexDirection: "row", gap: 8 },
  pkgName: { fontSize: 17, fontWeight: "700" },
  pkgMeta: { fontSize: 13, marginTop: 4 },
  empty: { textAlign: "center", marginTop: 24 },
});
