import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  CategoryChip,
  ClubCard,
  DiscoverHero,
  PremiumEmptyState,
  SearchInput,
  Skeleton,
} from "@/lib/components";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useClubTypes, useDiscoverClubs, type ClubTypeOption, type DiscoverClub } from "@/lib/discover";
import { colors, spacing } from "@/lib/theme";

export default function ClubsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const [query, setQuery] = useState("");
  const [clubType, setClubType] = useState(params.type || "");

  const { data, isLoading, refetch, isRefetching } = useDiscoverClubs(query, clubType || undefined);
  const { data: clubTypes } = useClubTypes();

  const clubs = data?.clubs ?? [];

  const categories = useMemo(() => {
    const all = clubTypes ?? [];
    const used = new Set(clubs.map((c: DiscoverClub) => c.clubType));
    return all.filter((t: ClubTypeOption) => used.has(t.id) || t.id === clubType);
  }, [clubTypes, clubs, clubType]);

  return (
    <View style={styles.root}>
      <DiscoverHero title="All clubs" subtitle={`${data?.total ?? 0} clubs on Dojo`} />
      <View style={styles.body}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search clubs, city, or code…" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <CategoryChip label="All" active={!clubType} onPress={() => setClubType("")} />
          {categories.map((t: ClubTypeOption) => (
            <CategoryChip
              key={t.id}
              label={t.nameEn}
              active={clubType === t.id}
              color={getClubTypeVisual(t.id).color}
              onPress={() => setClubType(clubType === t.id ? "" : t.id)}
            />
          ))}
        </ScrollView>

        {isLoading ? (
          <Skeleton height={400} />
        ) : (
          <FlatList
            data={clubs}
            keyExtractor={(c) => c.id}
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <PremiumEmptyState
                title="No clubs found"
                subtitle="Try a different search or sport filter"
              />
            }
            renderItem={({ item: club }) => {
              const vis = getClubTypeVisual(club.clubType);
              return (
                <ClubCard
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
  chips: { marginBottom: spacing.sm, maxHeight: 44 },
  list: { paddingBottom: 100, gap: 0 },
});
