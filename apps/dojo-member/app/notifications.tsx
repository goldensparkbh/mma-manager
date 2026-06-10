import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PremiumEmptyState, Screen } from "@/lib/components";
import { useI18n } from "@/lib/i18n";
import { getNotifications, markAllRead, type InboxNotification } from "@/lib/notificationsStore";
import { spacing, useThemeColors } from "@/lib/theme";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const colors = useThemeColors();
  const [items, setItems] = useState<InboxNotification[]>([]);

  const load = useCallback(async () => {
    const list = await getNotifications();
    setItems(list);
    await markAllRead();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.heading, { color: colors.text }]}>{t("notifications.title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <PremiumEmptyState title={t("notifications.empty")} subtitle={t("notifications.emptySub")} />
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.read ? 0.85 : 1 }]}>
            <Ionicons name="notifications" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>{item.body}</Text>
              <Text style={[styles.time, { color: colors.textMuted }]}>
                {format(new Date(item.receivedAt), "d MMM yyyy · HH:mm")}
              </Text>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  heading: { fontSize: 18, fontWeight: "800" },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40, gap: 8 },
  row: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: "700" },
  body: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  time: { fontSize: 12, marginTop: 6 },
});
