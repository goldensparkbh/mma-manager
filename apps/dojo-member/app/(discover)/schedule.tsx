import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  ClassRowCard,
  DiscoverHero,
  PremiumEmptyState,
  SearchInput,
  Skeleton,
} from "@/lib/components";
import { QueryErrorState } from "@/lib/errors";
import { useDiscoverSchedule } from "@/lib/discover";
import { useI18n } from "@/lib/i18n";
import { ScheduleMonthCalendar } from "@/lib/scheduleCalendar";
import { spacing, useThemeColors } from "@/lib/theme";

export default function ScheduleScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const { data, isLoading, isError, refetch, isRefetching } = useDiscoverSchedule({ q: query });

  const sessions = useMemo(() => data ?? [], [data]);

  const openClass = (item: (typeof sessions)[number]) => {
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
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <DiscoverHero title={t("schedule.title")} subtitle={t("schedule.subtitle")} />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >
        <SearchInput value={query} onChangeText={setQuery} placeholder={t("schedule.search")} />
        {isLoading ? (
          <Skeleton height={320} />
        ) : isError ? (
          <QueryErrorState onRetry={() => refetch()} />
        ) : sessions.length === 0 ? (
          <PremiumEmptyState title={t("schedule.noClasses")} subtitle={t("schedule.noClassesSub")} />
        ) : (
          <ScheduleMonthCalendar
            sessions={sessions}
            accent={colors.primary}
            onSessionPress={openClass}
            renderSession={(item) => {
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
                />
              );
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 100,
    gap: spacing.md,
  },
});
