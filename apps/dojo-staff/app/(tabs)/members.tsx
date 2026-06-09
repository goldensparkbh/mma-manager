import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, PrimaryButton, SearchInput, StaffHeader } from "@/lib/components";
import { useManualCheckIn, useMembers } from "@/lib/hooks";
import type { Member } from "@/lib/types";
import { useToast } from "@/lib/toast";
import { colors, spacing } from "@/lib/theme";

export default function MembersScreen() {
  const { tenant } = useAuth();
  const { show } = useToast();
  const [query, setQuery] = useState("");
  const { data: membersData, isLoading, refetch, isRefetching } = useMembers();
  const members: Member[] = membersData ?? [];
  const checkIn = useManualCheckIn();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.filter((m: Member) => m.status !== "inactive").slice(0, 50);
    return members
      .filter(
        (m: Member) =>
          m.name.toLowerCase().includes(q) ||
          m.phone?.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [members, query]);

  const onCheckIn = (memberId: string, memberName: string) => {
    Alert.alert("Check in member", `Mark ${memberName} as arrived?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Check in",
        onPress: async () => {
          try {
            await checkIn.mutateAsync({ memberId, memberName });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            show(`${memberName} checked in`, "success");
          } catch (e) {
            show((e as Error).message, "error");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <StaffHeader title="Members" subtitle="Search & manual check-in" tenantName={tenant?.name} />
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search name or phone…" />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? <Text style={styles.muted}>Loading…</Text> : <EmptyState title="No members found" />
        }
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone ? <Text style={styles.muted}>{item.phone}</Text> : null}
            </View>
            <View style={styles.btnWrap}>
              <PrimaryButton
                label="Check in"
                loading={checkIn.isPending}
                onPress={() => onCheckIn(item.id, item.name)}
              />
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.md },
  list: { paddingBottom: 100 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  btnWrap: { width: 110 },
});
