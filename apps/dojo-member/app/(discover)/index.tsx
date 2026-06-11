import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ClassRowCard,
  ClubGridCard,
  DiscoverHero,
  PremiumEmptyState,
  Screen,
  SearchInput,
  SectionTitle,
  Skeleton,
  SportCategoryCard,
} from "@/lib/components";
import { QueryErrorState } from "@/lib/errors";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useClubTypes, useDiscoverClubs, useDiscoverSchedule, type ClubTypeOption, type DiscoverClub, type DiscoverClass } from "@/lib/discover";
import { useTypography } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { spacing, useThemeColors } from "@/lib/theme";

export default function ExploreScreen() {
  const router = useRouter();
  const { t, clubTypeName } = useI18n();
  const colors = useThemeColors();
  const typo = useTypography();
  const [query, setQuery] = useState("");

  const { data: clubsData, isLoading: loadingClubs, isError: clubsError, refetch: refetchClubs, isRefetching } = useDiscoverClubs(query || undefined);
  const { data: scheduleData, isLoading: loadingSchedule, isError: scheduleError, refetch: refetchSchedule } = useDiscoverSchedule();
  const { data: clubTypes } = useClubTypes();

  const clubs = clubsData?.clubs ?? [];
  const schedule = scheduleData ?? [];

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of clubs) counts.set(c.clubType, (counts.get(c.clubType) || 0) + 1);
    return (clubTypes ?? [])
      .filter((t: ClubTypeOption) => counts.has(t.id))
      .slice(0, 10)
      .map((t: ClubTypeOption) => ({
        id: t.id,
        label: clubTypeName(t.nameEn, t.nameAr),
        count: counts.get(t.id) || 0,
      }));
  }, [clubs, clubTypes, clubTypeName]);

  const upcoming = schedule.slice(0, 6);

  const onRefresh = useCallback(() => {
    refetchClubs();
    refetchSchedule();
  }, [refetchClubs, refetchSchedule]);

  return (
    <Screen scroll padTop={false} refreshing={isRefetching} onRefresh={onRefresh} style={styles.screen}>
      <DiscoverHero
        photoHero
        title={t("explore.title")}
        subtitle={t("explore.subtitle")}
        stats={[
          { value: clubsData?.total ?? clubs.length, label: t("explore.clubs") },
          { value: schedule.length, label: t("explore.classes14d") },
          { value: categories.length, label: t("explore.sports") },
        ]}
      >
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("clubs.search")}
          onDark
        />
      </DiscoverHero>

      {categories.length > 0 ? (
        <>
          <SectionTitle
            title={t("explore.browseSport")}
            action={
              <Text
                style={[styles.link, { color: colors.primary }, typo.style("semibold")]}
                onPress={() => router.push("/(discover)/clubs")}
              >
                {t("explore.seeAll")}
              </Text>
            }
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
            {categories.map((cat: { id: string; label: string; count: number }) => {
              const vis = getClubTypeVisual(cat.id);
              return (
                <SportCategoryCard
                  key={cat.id}
                  label={cat.label}
                  count={cat.count}
                  color={vis.color}
                  icon={vis.icon}
                  onPress={() => router.push({ pathname: "/(discover)/clubs", params: { type: cat.id } })}
                />
              );
            })}
          </ScrollView>
        </>
      ) : null}

      <SectionTitle
        title={t("explore.featured")}
        action={
          <Text
            style={[styles.link, { color: colors.primary }, typo.style("semibold")]}
            onPress={() => router.push("/(discover)/clubs")}
          >
            {t("explore.allClubs")}
          </Text>
        }
      />
      {loadingClubs ? (
        <View style={styles.gridSkeleton}>
          <Skeleton height={200} style={styles.gridItem} />
          <Skeleton height={200} style={styles.gridItem} />
        </View>
      ) : clubsError ? (
        <QueryErrorState onRetry={() => refetchClubs()} />
      ) : clubs.length === 0 ? (
        <PremiumEmptyState title={t("explore.noClubs")} subtitle={t("explore.noClubsSub")} />
      ) : (
        <View style={styles.grid}>
          {clubs.map((club: DiscoverClub) => {
            const vis = getClubTypeVisual(club.clubType);
            return (
              <View key={club.id} style={styles.gridItem}>
                <ClubGridCard
                  name={club.name}
                  clubType={vis.label}
                  location={club.location}
                  logoUrl={club.logoUrl}
                  accent={club.primaryColor || vis.color}
                  typeIcon={vis.icon}
                  typeColor={vis.color}
                  typeColorSoft={vis.colorSoft}
                  upcomingCount={club.upcomingClassCount}
                  onPress={() => router.push(`/club/${club.portalSlug}`)}
                />
              </View>
            );
          })}
        </View>
      )}

      <SectionTitle
        title={t("explore.upcoming")}
        action={
          <Text
            style={[styles.link, { color: colors.primary }, typo.style("semibold")]}
            onPress={() => router.push("/(discover)/schedule")}
          >
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
          {upcoming.map((s: DiscoverClass) => (
            <View key={s.id} style={styles.classCardWrap}>
              <ClassRowCard
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
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  sportScroll: { marginBottom: spacing.md, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md },
  link: { fontSize: 13, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingBottom: spacing.sm },
  gridItem: { width: "48%" },
  gridSkeleton: { flexDirection: "row", gap: spacing.sm },
  classScroll: { marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  classCardWrap: { width: 300, marginRight: spacing.sm },
});
