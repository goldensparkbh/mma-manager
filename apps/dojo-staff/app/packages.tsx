import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, Screen, StaffHeader } from "@/lib/components";
import { usePackages, useSavePackage } from "@/lib/hooks";
import { colors, radius, spacing } from "@/lib/theme";

export default function PackagesScreen() {
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

  return (
      <Screen scroll refreshing={isRefetching} onRefresh={() => refetch()}>
        <StaffHeader title="Member packages" subtitle="Plans members can register for" />
        <Card>
          <Text style={styles.label}>Add package</Text>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Price" placeholderTextColor={colors.textMuted} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Days" placeholderTextColor={colors.textMuted} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
          </View>
          <PrimaryButton label="Add package" onPress={addPackage} loading={save.isPending} />
        </Card>
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <Text style={styles.pkgName}>{pkg.name}</Text>
            <Text style={styles.pkgMeta}>
              {pkg.price} · {pkg.duration} days
              {pkg.packageType ? ` · ${pkg.packageType}` : ""}
            </Text>
          </Card>
        ))}
        {!packages.length ? <Text style={styles.empty}>No packages yet — add your first plan above.</Text> : null}
      </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.bg, marginBottom: 8 },
  row: { flexDirection: "row", gap: 8 },
  pkgName: { fontSize: 17, fontWeight: "700", color: colors.text },
  pkgMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 24 },
});
