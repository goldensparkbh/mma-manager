import { format, isToday, isTomorrow } from "date-fns";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";
import {
  ClassRowCard,
  DiscoverHero,
  PremiumEmptyState,
  SearchInput,
  Skeleton,
} from "@/lib/components";
import { useDiscoverSchedule } from "@/lib/discover";
import { colors, spacing } from "@/lib/theme";

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, d MMM");
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, isLoading, refetch, isRefetching } = useDiscoverSchedule({ q: query });

  const sections = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>>();
    for (const s of data ?? []) {
      const key = format(new Date(s.startsAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({
        title: dayLabel(new Date(key)),
        data: items,
      }));
  }, [data]);

  return (
    <View style={styles.root}>
      <DiscoverHero title="Class schedule" subtitle="Upcoming sessions across all clubs" />
      <View style={styles.body}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search class, coach, or club…" />
        {isLoading ? (
          <Skeleton height={300} />
        ) : sections.length === 0 ? (
          <PremiumEmptyState title="No classes found" subtitle="Try another search or check back later" />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const spots =
                item.capacity > 0
                  ? `${item.bookedCount ?? 0}/${item.capacity} spots`
                  : undefined;
              return (
                <ClassRowCard
                  name={item.name}
                  clubName={item.clubName}
                  time={format(new Date(item.startsAt), "HH:mm")}
                  coach={item.coachName}
                  spots={spots}
                  accent={item.primaryColor || colors.primary}
                  onPress={() => router.push(`/club/${item.clubSlug}`)}
                />
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  list: { paddingBottom: 100 },
  sectionHead: {
    backgroundColor: colors.bg,
    paddingVertical: 8,
    paddingTop: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
});
