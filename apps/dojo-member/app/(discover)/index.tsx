import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  CategoryChip,
  ClubCard,
  DiscoverHero,
  PremiumEmptyState,
  Screen,
  SectionTitle,
  Skeleton,
} from "@/lib/components";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useClubTypes, useDiscoverClubs, useDiscoverSchedule, type ClubTypeOption, type DiscoverClub, type DiscoverClass } from "@/lib/discover";
import { DiscoverIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import { colors, spacing } from "@/lib/theme";

export default function ExploreScreen() {
  const router = useRouter();
  const { data: clubsData, isLoading: loadingClubs } = useDiscoverClubs();
  const { data: scheduleData, isLoading: loadingSchedule } = useDiscoverSchedule();
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
      .map((t: ClubTypeOption) => ({ id: t.id, label: t.nameEn, count: counts.get(t.id) || 0 }));
  }, [clubs, clubTypes]);

  const upcoming = schedule.slice(0, 8);

  return (
    <Screen scroll>
      <DiscoverHero
        title="Find your club"
        subtitle="Browse clubs, explore schedules, and join when you're ready"
      />

      <FadeInView>
        <View style={styles.illus}>
          <DiscoverIllustration size={220} />
        </View>
      </FadeInView>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{clubsData?.total ?? clubs.length}</Text>
          <Text style={styles.statLabel}>Clubs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{schedule.length}</Text>
          <Text style={styles.statLabel}>Classes (14d)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{categories.length}</Text>
          <Text style={styles.statLabel}>Sports</Text>
        </View>
      </View>

      <SectionTitle
        title="Browse by sport"
        action={
          <Text style={styles.link} onPress={() => router.push("/(discover)/clubs")}>
            See all
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
        title="Featured clubs"
        action={
          <Text style={styles.link} onPress={() => router.push("/(discover)/clubs")}>
            All clubs
          </Text>
        }
      />
      {loadingClubs ? (
        <Skeleton height={88} />
      ) : featured.length === 0 ? (
        <PremiumEmptyState title="No clubs yet" subtitle="Clubs with member portals will appear here" />
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
        title="Upcoming classes"
        action={
          <Text style={styles.link} onPress={() => router.push("/(discover)/schedule")}>
            Full schedule
          </Text>
        }
      />
      {loadingSchedule ? (
        <Skeleton height={120} />
      ) : upcoming.length === 0 ? (
        <PremiumEmptyState title="No classes scheduled" subtitle="Check back soon for new sessions" />
      ) : (
        upcoming.map((s: DiscoverClass) => (
          <View key={s.id} style={styles.miniClass}>
            <Text style={styles.miniClassName}>{s.name}</Text>
            <Text style={styles.miniClassMeta}>
              {s.clubName} · {format(new Date(s.startsAt), "EEE d MMM · HH:mm")}
            </Text>
          </View>
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
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statNum: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: "600" },
  chipScroll: { marginBottom: spacing.md, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md },
  link: { fontSize: 13, fontWeight: "700", color: colors.primary },
  miniClass: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniClassName: { fontSize: 15, fontWeight: "700", color: colors.text },
  miniClassMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
