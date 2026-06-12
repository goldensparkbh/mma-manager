import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ClassRowCard,
  ClubGridCard,
  ExploreTopBar,
  PremiumEmptyState,
  Screen,
  SectionTitle,
  Skeleton,
  SportCategoryImageCard,
} from "@/lib/components";
import { QueryErrorState } from "@/lib/errors";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useClubTypes, useDiscoverBanners, useDiscoverClubs, useDiscoverSchedule, type ClubTypeOption, type DiscoverClub, type DiscoverClass, type DiscoverPromoBanner } from "@/lib/discover";
import { useI18n } from "@/lib/i18n";
import { openPromoBannerLink, PromoBannerCarousel } from "@/lib/promo-banner-carousel";
import { spacing, useThemeColors } from "@/lib/theme";

const PAGE_COLS = 4;
const PAGE_ROWS = 2;
const PAGE_SIZE = PAGE_COLS * PAGE_ROWS;
const GRID_GAP = 8;
const H_PAD = spacing.md;

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

export default function ExploreScreen() {
  const router = useRouter();
  const { t, clubTypeName, locale } = useI18n();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");

  const pageWidth = Dimensions.get("window").width;
  const tileWidth = (pageWidth - H_PAD * 2 - GRID_GAP * (PAGE_COLS - 1)) / PAGE_COLS;
  const sportGridHeight = tileWidth * PAGE_ROWS + 96;

  const { data: clubsData, isLoading: loadingClubs, isError: clubsError, refetch: refetchClubs, isRefetching } = useDiscoverClubs(query || undefined);
  const { data: scheduleData, isLoading: loadingSchedule, isError: scheduleError, refetch: refetchSchedule } = useDiscoverSchedule();
  const { data: clubTypes } = useClubTypes();
  const { data: promoBanners, isLoading: loadingBanners, refetch: refetchBanners } = useDiscoverBanners(locale);

  const clubs = clubsData?.clubs ?? [];
  const schedule = scheduleData ?? [];

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of clubs) counts.set(c.clubType, (counts.get(c.clubType) || 0) + 1);
    return (clubTypes ?? [])
      .map((type: ClubTypeOption) => ({
        id: type.id,
        label: clubTypeName(type.nameEn, type.nameAr),
        count: counts.get(type.id) || 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [clubs, clubTypes, clubTypeName]);

  const categoryPages = useMemo(() => chunk(categories, PAGE_SIZE), [categories]);
  const upcoming = schedule.slice(0, 6);

  const onRefresh = useCallback(() => {
    refetchClubs();
    refetchSchedule();
    refetchBanners();
  }, [refetchClubs, refetchSchedule, refetchBanners]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ExploreTopBar value={query} onChangeText={setQuery} placeholder={t("clubs.search")} />

      <Screen scroll padTop={false} refreshing={isRefetching} onRefresh={onRefresh} style={styles.screen}>
        <PromoBannerCarousel
          banners={promoBanners ?? []}
          loading={loadingBanners}
          onBannerPress={async (banner: DiscoverPromoBanner) => {
            if (banner.linkUrl) {
              await openPromoBannerLink(banner);
              return;
            }
            if (banner.clubTypeId) {
              router.push({ pathname: "/(discover)/clubs", params: { type: banner.clubTypeId } });
            }
          }}
        />

        {categories.length > 0 ? (
          <>
            <SectionTitle title={t("explore.browseSport")} />
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={categoryPages}
              keyExtractor={(_, index) => `sport-page-${index}`}
              style={[styles.sportPager, { height: sportGridHeight }]}
              renderItem={({ item: page }) => (
                <View style={[styles.sportPage, { width: pageWidth }]}>
                  <View style={styles.sportGrid}>
                    {page.map((cat) => (
                      <SportCategoryImageCard
                        key={cat.id}
                        clubTypeId={cat.id}
                        label={cat.label}
                        count={cat.count}
                        width={tileWidth}
                        countLabel={t("explore.clubCount", { count: cat.count })}
                        onPress={() => router.push({ pathname: "/(discover)/clubs", params: { type: cat.id } })}
                      />
                    ))}
                  </View>
                </View>
              )}
            />
          </>
        ) : null}

        <SectionTitle title={t("explore.featured")} />
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

        <SectionTitle title={t("explore.upcoming")} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { paddingTop: 0 },
  sportPager: { marginHorizontal: -spacing.md, marginBottom: spacing.md },
  sportPage: { paddingHorizontal: H_PAD },
  sportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: GRID_GAP,
    rowGap: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingBottom: spacing.sm },
  gridItem: { width: "48%" },
  gridSkeleton: { flexDirection: "row", gap: spacing.sm },
  classScroll: { marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  classCardWrap: { width: 300, marginRight: spacing.sm },
});
