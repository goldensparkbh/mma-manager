import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { Card, PrimaryButton, Screen, StaffHeader, UpgradeBanner } from "@/lib/components";
import { useInviteStaff, useStaffUsers } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { colors, radius } from "@/lib/theme";

export default function TeamScreen() {
  const { planLimits, isFreePlan } = useAuth();
  const { data: users = [], refetch, isRefetching } = useStaffUsers();
  const invite = useInviteStaff();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    try {
      await invite.mutateAsync({ email: email.trim(), name: name.trim(), password, role: "staff" });
      setEmail("");
      setName("");
      setPassword("");
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
      <Screen scroll refreshing={isRefetching} onRefresh={() => refetch()}>
        <StaffHeader
          title="Staff team"
          subtitle={planLimits ? `${users.length} / ${planLimits.maxUsers} users on your plan` : undefined}
        />
        {isFreePlan ? <UpgradeBanner compact /> : null}
        <Card>
          <Text style={styles.label}>Invite staff</Text>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Temporary password" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
          <PrimaryButton label="Add staff member" onPress={submit} loading={invite.isPending} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>
        {users.map((u) => (
          <Card key={u.id}>
            <Text style={styles.userName}>{u.displayName || u.email}</Text>
            <Text style={styles.userMeta}>{u.email} · {u.role}</Text>
          </Card>
        ))}
      </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.bg, marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: "700", color: colors.text },
  userMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  error: { color: colors.danger, marginTop: 8, textAlign: "center" },
});
