import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import {
  Badge,
  Card,
  IconRow,
  PremiumEmptyState,
  PrimaryButton,
  QuickAction,
  Screen,
  SectionTitle,
  Skeleton,
} from "@/lib/components";
import { useBookings, useCamps, useRegisterCamp } from "@/lib/hooks";
import { BookingsIllustration, ClassesIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import type { Booking, CampEvent } from "@/lib/types";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { spacing, useThemeColors, withAlpha } from "@/lib/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { member, activeSubscription } = useAuth();
  const { accent } = useBranding();
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const { data: bookingsData, isLoading: loadingBookings, refetch: refetchBookings, isRefetching } = useBookings();
  const { data: campsData, isLoading: loadingCamps } = useCamps();
  const bookings: Booking[] = bookingsData ?? [];
  const camps: CampEvent[] = campsData ?? [];
  const registerCamp = useRegisterCamp();

  const nextBooking = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          (b.status === "confirmed" || b.status === "waitlist") &&
          b.startsAt &&
          new Date(b.startsAt) > new Date(),
      )
      .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime())[0];
  }, [bookings]);

  const onRegisterCamp = async (id: string) => {
    try {
      await registerCamp.mutateAsync(id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      show("Registered for event", "success");
    } catch (e) {
      show((e as Error).message, "error");
    }
  };

  return (
    <Screen
      scroll
      refreshing={isRefetching}
      onRefresh={() => refetchBookings()}
      padTop={false}
      style={{ paddingTop: insets.top + spacing.sm }}
    >
      <FadeInView delay={0}>
        <View style={styles.quickRow}>
          <QuickAction icon="calendar" label={t("tabs.classes")} onPress={() => router.push("/(member)/classes")} accent={accent} />
          <QuickAction icon="qr-code" label={t("member.checkInQr")} onPress={() => router.push("/(member)/profile")} accent={accent} />
          <QuickAction icon="card" label={t("tabs.pay")} onPress={() => router.push("/(member)/payments")} accent={accent} />
          <QuickAction icon="bookmark" label={t("tabs.bookings")} onPress={() => router.push("/(member)/bookings")} accent={accent} />
        </View>
      </FadeInView>

      <FadeInView delay={60}>
        <Card style={{ ...styles.membershipCard, borderColor: withAlpha(accent, 0.35) }}>
          <SectionTitle title={t("member.membership")} />
          {activeSubscription ? (
            <>
              <IconRow icon="ribbon" label={t("member.plan")} value={activeSubscription.planName} accent={accent} />
              {activeSubscription.packageType === "sessions" ? (
                <IconRow icon="fitness" label={t("member.sessionsLeft")} value={String(activeSubscription.sessionsRemaining ?? 0)} accent={accent} />
              ) : activeSubscription.endDate ? (
                <IconRow icon="time" label={t("member.validUntil")} value={format(new Date(activeSubscription.endDate), "d MMM yyyy")} accent={accent} />
              ) : null}
              <Badge label={t("member.active")} tone="success" />
            </>
          ) : (
            <>
              <PremiumEmptyState
                title={t("member.noPlan")}
                subtitle={t("member.noPlanSub")}
                illustration={<ClassesIllustration size={140} />}
              />
              <PrimaryButton label={t("member.viewPackages")} icon="card" onPress={() => router.push("/(member)/payments")} />
            </>
          )}
        </Card>
      </FadeInView>

      <FadeInView delay={120}>
        <SectionTitle title={t("member.nextClass")} />
        {loadingBookings ? (
          <Skeleton height={100} />
        ) : nextBooking ? (
          <Card>
            <IconRow icon="calendar" label={nextBooking.sessionName || "Class"} value={nextBooking.startsAt ? format(new Date(nextBooking.startsAt), "EEE d MMM · HH:mm") : ""} accent={accent} />
            <Badge label={nextBooking.status} tone={nextBooking.status === "waitlist" ? "warning" : "success"} />
          </Card>
        ) : (
          <PremiumEmptyState
            title={t("member.nothingBooked")}
            subtitle={t("member.nothingBookedSub")}
            illustration={<BookingsIllustration size={130} />}
          />
        )}
      </FadeInView>

      <FadeInView delay={180}>
        <Pressable style={[styles.qrCta, { backgroundColor: accent }]} onPress={() => router.push("/(member)/profile")}>
          <Text style={styles.qrTitle}>{t("member.checkInQr")}</Text>
          <Text style={styles.qrSub}>{t("member.checkInQrSub")}</Text>
        </Pressable>
      </FadeInView>

      <FadeInView delay={220}>
        <SectionTitle title={t("member.events")} />
        {loadingCamps ? (
          <Skeleton height={100} />
        ) : camps.length === 0 ? (
          <PremiumEmptyState title={t("member.noEvents")} subtitle={t("member.newCamps")} />
        ) : (
          camps.slice(0, 3).map((camp) => (
            <Card key={camp.id} style={styles.gap}>
              <IconRow icon="trophy" label={camp.title} value={format(new Date(camp.startDate), "EEE d MMM · HH:mm")} accent={accent} />
              {camp.price != null ? <Text style={[styles.meta, { color: colors.textMuted }]}>{camp.price} BHD</Text> : null}
              <PrimaryButton label={t("member.register")} icon="checkmark-circle" loading={registerCamp.isPending} onPress={() => onRegisterCamp(camp.id)} />
            </Card>
          ))
        )}
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  membershipCard: { borderWidth: 1.5, gap: spacing.sm },
  gap: { gap: spacing.sm },
  meta: { fontSize: 14 },
  qrCta: { borderRadius: 18, padding: 22, marginTop: 4, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  qrTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  qrSub: { color: "rgba(255,255,255,0.88)", fontSize: 13, marginTop: 6 },
});
