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
import { useI18n } from "@/lib/i18n";
import { spacing, useThemeColors } from "@/lib/theme";

export default function ScheduleScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const { data, isLoading, refetch, isRefetching } = useDiscoverSchedule({ q: query });

  const dayLabel = (date: Date) => {
    if (isToday(date)) return t("common.today");
    if (isTomorrow(date)) return t("common.tomorrow");
    return format(date, "EEEE, d MMM");
  };

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
  }, [data, t]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <DiscoverHero title={t("schedule.title")} subtitle={t("schedule.subtitle")} />
      <View style={styles.body}>
        <SearchInput value={query} onChangeText={setQuery} placeholder={t("schedule.search")} />
        {isLoading ? (
          <Skeleton height={300} />
        ) : sections.length === 0 ? (
          <PremiumEmptyState title={t("schedule.noClasses")} subtitle={t("schedule.noClassesSub")} />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => (
              <View style={[styles.sectionHead, { backgroundColor: colors.bg }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const spots =
                item.capacity > 0 ? `${item.bookedCount ?? 0}/${item.capacity}` : undefined;
              return (
                <ClassRowCard
                  name={item.name}
                  clubName={item.clubName}
                  time={format(new Date(item.startsAt), "HH:mm")}
                  coach={item.coachName}
                  spots={spots}
                  accent={item.primaryColor || colors.primary}
                  onPress={() =>
                    router.push({
                      pathname: "/class/[id]",
                      params: {
                        id: item.id,
                        clubSlug: item.clubSlug,
                        clubName: item.clubName,
                        startsAt: item.startsAt,
                        coach: item.coachName || "",
                        capacity: String(item.capacity),
                        booked: String(item.bookedCount ?? 0),
                      },
                    })
                  }
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
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  list: { paddingBottom: 100 },
  sectionHead: { paddingVertical: 8, paddingTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
});
