import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Badge, Card, IconRow, PrimaryButton, Screen, Skeleton } from "@/lib/components";
import { QueryErrorState } from "@/lib/errors";
import { useBookClass, useBookings, useClasses } from "@/lib/hooks";
import { useDiscoverSchedule, type DiscoverClass } from "@/lib/discover";
import type { Booking, ClassSession } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { useBranding } from "@/lib/branding";
import { useToast } from "@/lib/toast";
import { spacing, useThemeColors } from "@/lib/theme";

export default function ClassDetailScreen() {
  const { id, mode, clubSlug, clubName, startsAt, coach, capacity, booked } = useLocalSearchParams<{
    id: string;
    mode?: string;
    clubSlug?: string;
    clubName?: string;
    startsAt?: string;
    coach?: string;
    capacity?: string;
    booked?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t } = useI18n();
  const { show } = useToast();
  const { activeSubscription, member } = useAuth();
  const { accent } = useBranding();

  const isMember = mode === "member" && !!member;
  const { data: sessions, isLoading: loadingMember, isError: memberError, refetch } = useClasses();
  const { data: bookings } = useBookings();
  const bookClass = useBookClass();

  const { data: discoverSchedule, isLoading: loadingDiscover } = useDiscoverSchedule(
    clubSlug ? { clubSlug } : undefined,
  );

  const session = useMemo(() => {
    if (isMember) return sessions?.find((s: ClassSession) => s.id === id);
    return discoverSchedule?.find((s: DiscoverClass) => s.id === id);
  }, [isMember, sessions, discoverSchedule, id]);

  const isBooked = useMemo(
    () => bookings?.some((b: Booking) => b.sessionId === id && (b.status === "confirmed" || b.status === "waitlist")),
    [bookings, id],
  );

  const name = session?.name || clubName || "Class";
  const time = session?.startsAt || startsAt;
  const cap = session?.capacity ?? (capacity ? Number(capacity) : 0);
  const bookedCount = session?.bookedCount ?? (booked ? Number(booked) : 0);
  const coachName = session?.coachName || coach || null;
  const location = session?.location || null;
  const displayClub = clubName || (session && "clubName" in session ? (session as { clubName?: string }).clubName : undefined);

  const onBook = async () => {
    if (!id) return;
    try {
      await bookClass.mutateAsync(id);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      show("Class booked", "success");
      router.back();
    } catch (e) {
      show((e as Error).message, "error");
    }
  };

  const loading = isMember ? loadingMember : loadingDiscover;

  return (
    <Screen scroll>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.heading, { color: colors.text }]}>{t("class.detail")}</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <Skeleton height={180} />
      ) : memberError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : (
        <Card style={styles.gap}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          {displayClub ? <Text style={[styles.club, { color: accent }]}>{displayClub}</Text> : null}
          {time ? (
            <IconRow
              icon="time"
              label={format(new Date(time), "EEE d MMM · HH:mm")}
              value={t("class.detail")}
              accent={accent}
            />
          ) : null}
          {coachName ? <IconRow icon="person" label={t("class.coach")} value={coachName} accent={accent} /> : null}
          {location ? <IconRow icon="location" label={t("class.location")} value={location} accent={accent} /> : null}
          {cap > 0 ? (
            <Badge label={`${t("class.spots")}: ${bookedCount}/${cap}`} tone={bookedCount >= cap ? "warning" : "default"} />
          ) : null}

          {isMember ? (
            isBooked ? (
              <Badge label={t("class.booked")} tone="success" />
            ) : (
              <PrimaryButton
                label={bookedCount >= cap && cap > 0 ? t("class.waitlist") : t("class.book")}
                disabled={!activeSubscription}
                loading={bookClass.isPending}
                onPress={onBook}
              />
            )
          ) : (
            <PrimaryButton
              label={t("club.signIn")}
              icon="log-in"
              onPress={() => clubSlug && router.push("/login")}
            />
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  heading: { fontSize: 17, fontWeight: "800" },
  gap: { gap: spacing.sm },
  name: { fontSize: 22, fontWeight: "800" },
  club: { fontSize: 15, fontWeight: "700" },
});
