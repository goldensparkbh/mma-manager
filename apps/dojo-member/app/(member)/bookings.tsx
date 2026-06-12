import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Badge, Card, PremiumEmptyState, PrimaryButton, Skeleton } from "@/lib/components";
import { BookingsIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import { useBranding } from "@/lib/branding";
import { useBookings, useCancelBooking } from "@/lib/hooks";
import type { Booking } from "@/lib/types";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/format";
import { spacing, useThemeColors } from "@/lib/theme";

export default function BookingsScreen() {
  const { show } = useToast();
  const { accent } = useBranding();
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const { data: bookingsData, isLoading, refetch, isRefetching } = useBookings();
  const bookings: Booking[] = bookingsData ?? [];
  const cancelBooking = useCancelBooking();

  const upcoming = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            (b.status === "confirmed" || b.status === "waitlist") &&
            b.startsAt &&
            new Date(b.startsAt) > new Date(),
        )
        .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime()),
    [bookings],
  );

  const past = useMemo(
    () =>
      bookings
        .filter((b) => b.startsAt && new Date(b.startsAt) <= new Date())
        .slice(0, 10),
    [bookings],
  );

  const onCancel = (id: string, name?: string) => {
    Alert.alert(t("member.cancelBooking"), t("member.cancelConfirm", { name: name || "this class" }), [
      { text: t("member.keep"), style: "cancel" },
      {
        text: t("member.cancelBooking"),
        style: "destructive",
        onPress: async () => {
          try {
            await cancelBooking.mutateAsync(id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            show(t("member.bookingCancelled"), "success");
          } catch (e) {
            show((e as Error).message, "error");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + spacing.sm }]}>
      {isLoading ? (
        <Skeleton height={120} style={styles.pad} />
      ) : (
        <FlatList
          data={upcoming}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={[styles.heading, { color: colors.text }]}>{t("member.upcoming")}</Text>}
          ListEmptyComponent={
            <PremiumEmptyState
              title={t("member.noUpcoming")}
              subtitle={t("member.noUpcomingSub")}
              illustration={<BookingsIllustration size={150} />}
            />
          }
          ListFooterComponent={
            past.length > 0 ? (
              <View style={styles.past}>
                <Text style={[styles.heading, { color: colors.text }]}>{t("member.recent")}</Text>
                {past.map((b) => (
                  <Card key={b.id} style={styles.card}>
                    <Text style={[styles.name, { color: colors.text }]}>{b.sessionName}</Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {b.startsAt && format(new Date(b.startsAt), "EEE d MMM · HH:mm")}
                    </Text>
                    <Badge label={b.status} />
                  </Card>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <FadeInView delay={index * 50}>
            <Card style={styles.card}>
              <Text style={[styles.name, { color: colors.text }]}>{item.sessionName}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {item.startsAt && format(new Date(item.startsAt), "EEE d MMM · HH:mm")}
              </Text>
              <View style={styles.row}>
                <Badge label={bookingStatusLabel(item.status, locale)} tone={bookingStatusTone(item.status)} />
                <PrimaryButton
                  label={t("common.cancel")}
                  variant="danger"
                  loading={cancelBooking.isPending}
                  onPress={() => onCancel(item.id, item.sessionName)}
                />
              </View>
            </Card>
            </FadeInView>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { margin: spacing.md },
  list: { padding: spacing.md, paddingBottom: 100, gap: spacing.sm },
  heading: { fontSize: 17, fontWeight: "700", marginBottom: spacing.sm },
  card: { gap: 6, marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 12 },
  past: { marginTop: spacing.lg },
});
