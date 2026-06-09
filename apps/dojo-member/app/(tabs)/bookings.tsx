import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Badge, Card, ClubHeader, PremiumEmptyState, PrimaryButton, Skeleton } from "@/lib/components";
import { BookingsIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import { useBranding } from "@/lib/branding";
import { useBookings, useCancelBooking } from "@/lib/hooks";
import type { Booking } from "@/lib/types";
import { useToast } from "@/lib/toast";
import { colors, spacing } from "@/lib/theme";

export default function BookingsScreen() {
  const { show } = useToast();
  const { clubName, portalInfo } = useAuth();
  const { accent } = useBranding();

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
    Alert.alert("Cancel booking", `Cancel ${name || "this class"}?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel booking",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelBooking.mutateAsync(id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            show("Booking cancelled", "success");
          } catch (e) {
            show((e as Error).message, "error");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ClubHeader clubName={clubName} logoUrl={portalInfo?.logoUrl} accent={accent} subtitle="Your schedule" />
      {isLoading ? (
        <Skeleton height={120} style={styles.pad} />
      ) : (
        <FlatList
          data={upcoming}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.heading}>Upcoming</Text>}
          ListEmptyComponent={
            <PremiumEmptyState
              title="No upcoming bookings"
              subtitle="Book a class from the Classes tab"
              illustration={<BookingsIllustration size={150} />}
            />
          }
          ListFooterComponent={
            past.length > 0 ? (
              <View style={styles.past}>
                <Text style={styles.heading}>Recent</Text>
                {past.map((b) => (
                  <Card key={b.id} style={styles.card}>
                    <Text style={styles.name}>{b.sessionName}</Text>
                    <Text style={styles.meta}>
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
              <Text style={styles.name}>{item.sessionName}</Text>
              <Text style={styles.meta}>
                {item.startsAt && format(new Date(item.startsAt), "EEE d MMM · HH:mm")}
              </Text>
              <View style={styles.row}>
                <Badge label={item.status} tone={item.status === "waitlist" ? "warning" : "success"} />
                <PrimaryButton
                  label="Cancel"
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
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { margin: spacing.md },
  list: { padding: spacing.md, paddingBottom: 100, gap: spacing.sm },
  heading: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  card: { gap: 6, marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 12 },
  past: { marginTop: spacing.lg },
});
