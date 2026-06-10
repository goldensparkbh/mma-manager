import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  CategoryChip,
  ClassRowCard,
  ClubCard,
  DiscoverHero,
  PremiumEmptyState,
  Screen,
  SectionTitle,
  Skeleton,
} from "@/lib/components";
import { QueryErrorState } from "@/lib/errors";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useClubTypes, useDiscoverClubs, useDiscoverSchedule, type ClubTypeOption, type DiscoverClub, type DiscoverClass } from "@/lib/discover";
import { DiscoverIllustration } from "@/lib/illustrations";
import { useI18n } from "@/lib/i18n";
import { FadeInView } from "@/lib/motion";
import { spacing, useThemeColors } from "@/lib/theme";

export default function ExploreScreen() {
  const router = useRouter();
  const { t, clubTypeName } = useI18n();
  const colors = useThemeColors();

  const { data: clubsData, isLoading: loadingClubs, isError: clubsError, refetch: refetchClubs, isRefetching } = useDiscoverClubs();
  const { data: scheduleData, isLoading: loadingSchedule, isError: scheduleError, refetch: refetchSchedule } = useDiscoverSchedule();
  const { data: clubTypes } = useClubTypes();

  const clubs = clubsData?.clubs ?? [];
  const schedule = scheduleData ?? [];

  const featured = useMemo(() => clubs.filter((c: DiscoverClub) => c.upcomingClassCount > 0).slice(0, 6), [clubs]);
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of clubs) counts.set(c.clubType, (counts.get(c.clubType) || 0) + 1);
    return (clubTypes ?? [])
      .filter((t: ClubTypeOption) => counts.has(t.id))
      .slice(0, 8)
      .map((t: ClubTypeOption) => ({
        id: t.id,
        label: clubTypeName(t.nameEn, t.nameAr),
        count: counts.get(t.id) || 0,
      }));
  }, [clubs, clubTypes, clubTypeName]);

  const upcoming = schedule.slice(0, 8);

  const onRefresh = useCallback(() => {
    refetchClubs();
    refetchSchedule();
  }, [refetchClubs, refetchSchedule]);

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={onRefresh}>
      <DiscoverHero title={t("explore.title")} subtitle={t("explore.subtitle")} />

      <FadeInView>
        <View style={styles.illus}>
          <DiscoverIllustration size={220} />
        </View>
      </FadeInView>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.text }]}>{clubsData?.total ?? clubs.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t("explore.clubs")}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.text }]}>{schedule.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t("explore.classes14d")}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.text }]}>{categories.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t("explore.sports")}</Text>
        </View>
      </View>

      <SectionTitle
        title={t("explore.browseSport")}
        action={
          <Text style={[styles.link, { color: colors.primary }]} onPress={() => router.push("/(discover)/clubs")}>
            {t("explore.seeAll")}
          </Text>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {categories.map((cat: { id: string; label: string; count: number }) => (
          <CategoryChip
            key={cat.id}
            label={`${cat.label} (${cat.count})`}
            onPress={() => router.push({ pathname: "/(discover)/clubs", params: { type: cat.id } })}
          />
        ))}
      </ScrollView>

      <SectionTitle
        title={t("explore.featured")}
        action={
          <Text style={[styles.link, { color: colors.primary }]} onPress={() => router.push("/(discover)/clubs")}>
            {t("explore.allClubs")}
          </Text>
        }
      />
      {loadingClubs ? (
        <Skeleton height={88} />
      ) : clubsError ? (
        <QueryErrorState onRetry={() => refetchClubs()} />
      ) : featured.length === 0 ? (
        <PremiumEmptyState title={t("explore.noClubs")} subtitle={t("explore.noClubsSub")} />
      ) : (
        featured.map((club: DiscoverClub) => {
          const vis = getClubTypeVisual(club.clubType);
          return (
            <ClubCard
              key={club.id}
              name={club.name}
              clubType={vis.label}
              location={club.location}
              logoUrl={club.logoUrl}
              accent={club.primaryColor || vis.color}
              typeIcon={vis.icon}
              typeColor={vis.color}
              typeColorSoft={vis.colorSoft}
              upcomingCount={club.upcomingClassCount}
              nextClassAt={club.nextClassAt}
              onPress={() => router.push(`/club/${club.portalSlug}`)}
            />
          );
        })
      )}

      <SectionTitle
        title={t("explore.upcoming")}
        action={
          <Text style={[styles.link, { color: colors.primary }]} onPress={() => router.push("/(discover)/schedule")}>
            {t("explore.fullSchedule")}
          </Text>
        }
      />
      {loadingSchedule ? (
        <Skeleton height={120} />
      ) : scheduleError ? (
        <QueryErrorState onRetry={() => refetchSchedule()} />
      ) : upcoming.length === 0 ? (
        <PremiumEmptyState title={t("explore.noClasses")} subtitle={t("explore.noClassesSub")} />
      ) : (
        upcoming.map((s: DiscoverClass) => (
          <ClassRowCard
            key={s.id}
            name={s.name}
            clubName={s.clubName}
            time={format(new Date(s.startsAt), "EEE d MMM · HH:mm")}
            coach={s.coachName}
            spots={s.capacity > 0 ? `${s.bookedCount ?? 0}/${s.capacity}` : undefined}
            accent={s.primaryColor || colors.primary}
            onPress={() =>
              router.push({
                pathname: "/class/[id]",
                params: {
                  id: s.id,
                  clubSlug: s.clubSlug,
                  clubName: s.clubName,
                  startsAt: s.startsAt,
                  coach: s.coachName || "",
                  capacity: String(s.capacity),
                  booked: String(s.bookedCount ?? 0),
                },
              })
            }
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  illus: { alignItems: "center", marginVertical: spacing.sm },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: spacing.md },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  chipScroll: { marginBottom: spacing.md, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md },
  link: { fontSize: 13, fontWeight: "700" },
});
