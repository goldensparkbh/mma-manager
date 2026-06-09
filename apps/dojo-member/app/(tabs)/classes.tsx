import { format, isToday, isTomorrow } from "date-fns";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Badge, Card, ClubHeader, PremiumEmptyState, PrimaryButton, SearchInput, Skeleton } from "@/lib/components";
import { ClassesIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import { useBranding } from "@/lib/branding";
import { useBookClass, useBookings, useClasses } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import { colors, spacing } from "@/lib/theme";
import type { Booking, ClassSession } from "@/lib/types";

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, d MMM");
}

export default function ClassesScreen() {
  const { show } = useToast();
  const { activeSubscription, clubName, portalInfo } = useAuth();
  const { accent } = useBranding();
  const [query, setQuery] = useState("");

  const { data: sessionsData, isLoading, refetch, isRefetching } = useClasses();
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
      title: dayLabel(new Date(key)),
      items,
    }));
  }, [filtered]);

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
    <View style={styles.root}>
      <ClubHeader clubName={clubName} logoUrl={portalInfo?.logoUrl} accent={accent} subtitle="Book a class" />
      <View style={styles.body}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search classes or coach…" />
        {isLoading ? (
          <Skeleton height={120} />
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
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map((item) => {
                  const isBooked = bookedIds.has(item.id);
                  const full = (item.bookedCount ?? 0) >= item.capacity;
                  return (
                    <Card key={item.id} style={styles.card}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.meta}>{format(new Date(item.startsAt), "HH:mm")}</Text>
                      {item.coachName ? <Text style={styles.meta}>Coach {item.coachName}</Text> : null}
                      {item.location ? <Text style={styles.meta}>{item.location}</Text> : null}
                      <View style={styles.row}>
                        <Badge label={`${item.bookedCount ?? 0}/${item.capacity}`} />
                        {isBooked ? (
                          <Badge label="Booked" tone="success" />
                        ) : (
                          <PrimaryButton
                            label={full ? "Waitlist" : "Book"}
                            disabled={!activeSubscription}
                            loading={bookClass.isPending}
                            onPress={() => onBook(item.id)}
                          />
                        )}
                      </View>
                    </Card>
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
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  list: { paddingBottom: 100, gap: spacing.md },
  section: { gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 4 },
  card: { gap: 4 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 12 },
});
