import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, PrimaryButton, SearchInput, StaffHeader } from "@/lib/components";
import { useTypography } from "@/lib/fonts";
import { useManualCheckIn, useMembers } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import type { Member } from "@/lib/types";
import { useToast } from "@/lib/toast";
import { spacing, useThemeColors } from "@/lib/theme";

export default function MembersScreen() {
  const { tenant } = useAuth();
  const { t } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
  const { show } = useToast();
  const [query, setQuery] = useState("");
  const { data: membersData, isLoading, refetch, isRefetching } = useMembers();
  const members: Member[] = membersData ?? [];
  const checkIn = useManualCheckIn();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.filter((m: Member) => m.status !== "inactive").slice(0, 50);
    return members
      .filter((m: Member) => m.name.toLowerCase().includes(q) || m.phone?.toLowerCase().includes(q))
      .slice(0, 40);
  }, [members, query]);

  const onCheckIn = (memberId: string, memberName: string) => {
    Alert.alert(t("members.checkInTitle"), t("members.checkInConfirm", { name: memberName }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("members.checkIn"),
        onPress: async () => {
          try {
            await checkIn.mutateAsync({ memberId, memberName });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            show(t("members.checkedIn", { name: memberName }), "success");
          } catch (e) {
            show((e as Error).message, "error");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StaffHeader title={t("members.title")} subtitle={t("members.subtitle")} tenantName={tenant?.name} />
      <SearchInput value={query} onChangeText={setQuery} placeholder={t("common.search")} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.muted, { color: colors.textMuted }, typo.style("regular")]}>{t("common.loading")}</Text>
          ) : (
            <EmptyState title={t("members.notFound")} />
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }, typo.style("bold")]}>{item.name}</Text>
              {item.phone ? (
                <Text style={[styles.muted, { color: colors.textMuted }, typo.style("regular")]}>{item.phone}</Text>
              ) : null}
            </View>
            <View style={styles.btnWrap}>
              <PrimaryButton
                label={t("members.checkIn")}
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
  root: { flex: 1, paddingHorizontal: spacing.md },
  list: { paddingBottom: 100 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700" },
  muted: { fontSize: 13 },
  btnWrap: { width: 120 },
});
