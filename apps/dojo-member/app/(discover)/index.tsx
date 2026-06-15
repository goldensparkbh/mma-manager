import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
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
import { ClubMapView } from "@/lib/clubMap";
import { QueryErrorState } from "@/lib/errors";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useClubTypes, useDiscoverBanners, useDiscoverClubs, useDiscoverClubsMap, useDiscoverSchedule, type ClubTypeOption, type DiscoverClub, type DiscoverClass, type DiscoverPromoBanner } from "@/lib/discover";
import { useI18n } from "@/lib/i18n";
import { openPromoBannerLink, PromoBannerCarousel } from "@/lib/promo-banner-carousel";
import { ScheduleMonthCalendar } from "@/lib/scheduleCalendar";
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
  const [mapCountry, setMapCountry] = useState("");
  const [mapCity, setMapCity] = useState("");

  const pageWidth = Dimensions.get("window").width;
  const tileWidth = (pageWidth - H_PAD * 2 - GRID_GAP * (PAGE_COLS - 1)) / PAGE_COLS;
  const sportGridHeight = tileWidth * PAGE_ROWS + 82;

  const { data: clubsData, isLoading: loadingClubs, isError: clubsError, refetch: refetchClubs, isRefetching } = useDiscoverClubs(query || undefined);
  const { data: mapClubsData, isLoading: loadingMapClubs, isError: mapClubsError, refetch: refetchMapClubs } = useDiscoverClubsMap({
    q: query || undefined,
    country: mapCountry || undefined,
    city: mapCity || undefined,
  });
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
        imageUrl: type.imageUrl,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [clubs, clubTypes, clubTypeName]);

  const categoryPages = useMemo(() => chunk(categories, PAGE_SIZE), [categories]);
  const upcoming = schedule;

  const onRefresh = useCallback(() => {
    refetchClubs();
    refetchMapClubs();
    refetchSchedule();
    refetchBanners();
  }, [refetchClubs, refetchMapClubs, refetchSchedule, refetchBanners]);

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
            <SectionTitle title={t("explore.browseSport")} centered />
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
                        imageUrl={cat.imageUrl}
                        label={cat.label}
                        count={cat.count}
                        width={tileWidth}
                        onPress={() => router.push({ pathname: "/(discover)/clubs", params: { type: cat.id } })}
                      />
                    ))}
                  </View>
                </View>
              )}
            />
          </>
        ) : null}

        <SectionTitle
          title={t("map.title")}
          action={
            <Pressable onPress={() => router.push("/map" as never)} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>{t("map.openFull")}</Text>
            </Pressable>
          }
        />
        <ClubMapView
          clubs={mapClubsData?.clubs ?? []}
          loading={loadingMapClubs}
          isError={mapClubsError}
          onRetry={() => refetchMapClubs()}
          query={query}
          country={mapCountry}
          city={mapCity}
          onCountryChange={setMapCountry}
          onCityChange={setMapCity}
          showFilters
        />

        <SectionTitle title={t("explore.featured")} />
        {loadingClubs ? (
          <View style={styles.listSkeleton}>
            <Skeleton height={88} style={styles.listItem} />
            <Skeleton height={88} style={styles.listItem} />
          </View>
        ) : clubsError ? (
          <QueryErrorState onRetry={() => refetchClubs()} />
        ) : clubs.length === 0 ? (
          <PremiumEmptyState title={t("explore.noClubs")} subtitle={t("explore.noClubsSub")} />
        ) : (
          <View style={styles.list}>
            {clubs.map((club: DiscoverClub) => {
              const vis = getClubTypeVisual(club.clubType);
              return (
                <View key={club.id} style={styles.listItem}>
                  <ClubGridCard
                    name={club.name}
                    sportTypeIds={club.sportTypeIds?.length ? club.sportTypeIds : [club.clubType]}
                    location={club.location}
                    logoUrl={club.logoUrl}
                    accent={club.primaryColor || vis.color}
                    typeIcon={vis.icon}
                    typeColor={vis.color}
                    typeColorSoft={vis.colorSoft}
                    variant="list"
                    onPress={() => router.push(`/club/${club.portalSlug}`)}
                  />
                </View>
              );
            })}
          </View>
        )}

        <SectionTitle title={t("explore.upcoming")} />
        {loadingSchedule ? (
          <Skeleton height={320} />
        ) : scheduleError ? (
          <QueryErrorState onRetry={() => refetchSchedule()} />
        ) : upcoming.length === 0 ? (
          <PremiumEmptyState title={t("explore.noClasses")} subtitle={t("explore.noClassesSub")} />
        ) : (
          <ScheduleMonthCalendar
            sessions={upcoming}
            accent={colors.primary}
            onSessionPress={(s) =>
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
            renderSession={(s) => (
              <ClassRowCard
                name={s.name}
                clubName={s.clubName}
                time={format(new Date(s.startsAt), "HH:mm")}
                coach={s.coachName}
                spots={s.capacity > 0 ? `${s.bookedCount ?? 0}/${s.capacity}` : undefined}
                accent={s.primaryColor || colors.primary}
              />
            )}
          />
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
  list: { gap: spacing.sm, paddingBottom: spacing.sm },
  listItem: { width: "100%" },
  listSkeleton: { gap: spacing.sm },
});
