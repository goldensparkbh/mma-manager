import { format, isToday, isTomorrow } from "date-fns";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { ClassRowCard, ClubHeader, PremiumEmptyState, SearchInput, Skeleton } from "@/lib/components";
import { QueryErrorState } from "@/lib/errors";
import { ClassesIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import { useBranding } from "@/lib/branding";
import { useBookClass, useBookings, useClasses } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { spacing, useThemeColors } from "@/lib/theme";
import type { Booking, ClassSession } from "@/lib/types";

function dayLabel(date: Date, t: (k: "common.today" | "common.tomorrow") => string) {
  if (isToday(date)) return t("common.today");
  if (isTomorrow(date)) return t("common.tomorrow");
  return format(date, "EEEE, d MMM");
}

export default function ClassesScreen() {
  const router = useRouter();
  const { show } = useToast();
  const { activeSubscription, clubName, portalInfo } = useAuth();
  const { accent } = useBranding();
  const { t } = useI18n();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");

  const { data: sessionsData, isLoading, isError, refetch, isRefetching } = useClasses();
  const { data: bookingsData } = useBookings();
  const sessions: ClassSession[] = sessionsData ?? [];
  const bookings: Booking[] = bookingsData ?? [];
  const bookClass = useBookClass();

  const bookedIds = useMemo(
    () =>
      new Set(
        bookings.filter((b) => b.status === "confirmed" || b.status === "waitlist").map((b) => b.sessionId),
      ),
    [bookings],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => !q || s.name.toLowerCase().includes(q) || s.coachName?.toLowerCase().includes(q));
  }, [sessions, query]);

  const sections = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const s of filtered) {
      const key = format(new Date(s.startsAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()].map(([key, items]) => ({
      key,
      title: dayLabel(new Date(key), t),
      items,
    }));
  }, [filtered, t]);

  const onBook = async (sessionId: string) => {
    try {
      await bookClass.mutateAsync(sessionId);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      show("Class booked", "success");
    } catch (e) {
      show((e as Error).message, "error");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ClubHeader clubName={clubName} logoUrl={portalInfo?.logoUrl} accent={accent} subtitle="Book a class" />
      <View style={styles.body}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search classes or coach…" />
        {isLoading ? (
          <Skeleton height={120} />
        ) : isError ? (
          <QueryErrorState onRetry={() => refetch()} />
        ) : (
          <FlatList
            data={sections}
            keyExtractor={(item) => item.key}
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <PremiumEmptyState
                title="No classes found"
                subtitle="Try another search or check back later"
                illustration={<ClassesIllustration size={150} />}
              />
            }
            renderItem={({ item: section, index }) => (
              <FadeInView delay={index * 40} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                {section.items.map((item) => {
                  const isBooked = bookedIds.has(item.id);
                  const spots = item.capacity > 0 ? `${item.bookedCount ?? 0}/${item.capacity}` : undefined;
                  return (
                    <ClassRowCard
                      key={item.id}
                      name={item.name}
                      clubName={clubName}
                      time={format(new Date(item.startsAt), "HH:mm")}
                      coach={item.coachName}
                      spots={isBooked ? t("class.booked") : spots}
                      accent={accent}
                      onPress={() =>
                        router.push({
                          pathname: "/class/[id]",
                          params: {
                            id: item.id,
                            mode: "member",
                            clubName,
                            startsAt: item.startsAt,
                            coach: item.coachName || "",
                            capacity: String(item.capacity),
                            booked: String(item.bookedCount ?? 0),
                          },
                        })
                      }
                    />
                  );
                })}
              </FadeInView>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  list: { paddingBottom: 100, gap: spacing.md },
  section: { gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
});
