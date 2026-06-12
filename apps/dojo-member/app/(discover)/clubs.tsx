import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CategoryChip,
  ClubGridCard,
  DiscoverHero,
  PremiumEmptyState,
  SearchInput,
  Skeleton,
} from "@/lib/components";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useClubTypes, useDiscoverClubs, type ClubTypeOption, type DiscoverClub } from "@/lib/discover";
import { useI18n } from "@/lib/i18n";
import { spacing, useThemeColors, withAlpha } from "@/lib/theme";

export default function ClubsScreen() {
  const { t, clubTypeName } = useI18n();
  const colors = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const [query, setQuery] = useState("");
  const [clubType, setClubType] = useState(params.type || "");
  const [clubView, setClubView] = useState<"grid" | "list">("grid");

  const { data, isLoading, refetch, isRefetching } = useDiscoverClubs(query, clubType || undefined);
  const { data: clubTypes } = useClubTypes();

  const clubs = data?.clubs ?? [];

  const categories = useMemo(() => {
    const all = clubTypes ?? [];
    const used = new Set(clubs.map((c: DiscoverClub) => c.clubType));
    return all.filter((t: ClubTypeOption) => used.has(t.id) || t.id === clubType);
  }, [clubTypes, clubs, clubType]);

  const renderClub = useCallback(
    ({ item: club }: { item: DiscoverClub }) => {
      const vis = getClubTypeVisual(club.clubType);
      return (
        <View style={clubView === "grid" ? styles.gridItem : styles.listItem}>
          <ClubGridCard
            name={club.name}
            sportTypeIds={[club.clubType]}
            location={club.location}
            logoUrl={club.logoUrl}
            accent={club.primaryColor || vis.color}
            typeIcon={vis.icon}
            typeColor={vis.color}
            typeColorSoft={vis.colorSoft}
            variant={clubView}
            onPress={() => router.push(`/club/${club.portalSlug}`)}
          />
        </View>
      );
    },
    [router, clubView],
  );

  const listHeader = (
    <View style={styles.header}>
      <SearchInput value={query} onChangeText={setQuery} placeholder={t("clubs.search")} />
      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          <CategoryChip label={t("clubs.all")} active={!clubType} onPress={() => setClubType("")} />
          {categories.map((ct: ClubTypeOption) => (
            <CategoryChip
              key={ct.id}
              label={clubTypeName(ct.nameEn, ct.nameAr)}
              active={clubType === ct.id}
              color={getClubTypeVisual(ct.id).color}
              onPress={() => setClubType(clubType === ct.id ? "" : ct.id)}
            />
          ))}
        </ScrollView>
      </View>
      <View style={styles.viewToggleRow}>
        <Pressable
          onPress={() => setClubView("list")}
          style={[styles.viewToggleBtn, clubView === "list" && { backgroundColor: withAlpha(colors.primary, 0.12) }]}
          accessibilityLabel={t("explore.viewList")}
        >
          <Ionicons name="list" size={18} color={clubView === "list" ? colors.primary : colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => setClubView("grid")}
          style={[styles.viewToggleBtn, clubView === "grid" && { backgroundColor: withAlpha(colors.primary, 0.12) }]}
          accessibilityLabel={t("explore.viewGrid")}
        >
          <Ionicons name="grid" size={18} color={clubView === "grid" ? colors.primary : colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <DiscoverHero title={t("clubs.title")} subtitle={t("clubs.subtitle", { count: data?.total ?? 0 })} />
      {isLoading ? (
        <View style={styles.body}>
          {listHeader}
          <View style={styles.gridSkeleton}>
            <Skeleton height={88} style={styles.gridItem} />
            <Skeleton height={88} style={styles.gridItem} />
            <Skeleton height={88} style={styles.gridItem} />
            <Skeleton height={88} style={styles.gridItem} />
          </View>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={clubs}
          keyExtractor={(c) => c.id}
          renderItem={renderClub}
          numColumns={clubView === "grid" ? 2 : 1}
          key={clubView}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          columnWrapperStyle={clubView === "grid" ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <PremiumEmptyState title={t("clubs.notFound")} subtitle={t("clubs.notFoundSub")} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.md },
  header: { paddingBottom: spacing.sm },
  chipsWrap: {
    minHeight: 44,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  chipsContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    gap: 0,
  },
  list: { flex: 1, paddingHorizontal: spacing.md },
  listContent: { paddingBottom: 100, flexGrow: 1 },
  gridRow: { gap: spacing.sm, marginBottom: spacing.sm },
  gridItem: { flex: 1, maxWidth: "48.5%" },
  listItem: { width: "100%", marginBottom: spacing.sm },
  gridSkeleton: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  viewToggleRow: { flexDirection: "row", justifyContent: "flex-end", gap: 4, marginBottom: spacing.sm },
  viewToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
