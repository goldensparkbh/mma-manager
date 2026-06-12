import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import {
  Card,
  ClubGridCard,
  DiscoverHero,
  IconRow,
  PrimaryButton,
  Screen,
  SectionTitle,
} from "@/lib/components";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useI18n } from "@/lib/i18n";
import { getRecentClubs, type RecentClub } from "@/lib/recentClubs";
import { getFavoriteClubs, removeFavoriteClub, type SavedClub } from "@/lib/savedClubs";
import { spacing, useThemeColors } from "@/lib/theme";

function ClubGrid({
  clubs,
  onPress,
  onToggleFavorite,
}: {
  clubs: Array<SavedClub | RecentClub>;
  onPress: (slug: string) => void;
  onToggleFavorite?: (club: SavedClub | RecentClub) => void;
}) {
  return (
    <View style={styles.grid}>
      {clubs.map((club) => {
        const vis = getClubTypeVisual(club.clubType);
        const isFavorite = onToggleFavorite != null;
        return (
          <View key={club.slug} style={styles.gridItem}>
            <ClubGridCard
              name={club.name}
              sportTypeIds={club.clubType ? [club.clubType] : []}
              logoUrl={club.logoUrl}
              accent={club.primaryColor || vis.color}
              typeIcon={vis.icon}
              typeColor={vis.color}
              typeColorSoft={vis.colorSoft}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(club) : undefined}
              onPress={() => onPress(club.slug)}
            />
          </View>
        );
      })}
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const colors = useThemeColors();
  const { member, slug, clubName, portalInfo, logout, leaveClub } = useAuth();
  const [favorites, setFavorites] = useState<SavedClub[]>([]);
  const [recent, setRecent] = useState<RecentClub[]>([]);

  const load = useCallback(async () => {
    const [fav, rec] = await Promise.all([getFavoriteClubs(), getRecentClubs()]);
    setFavorites(fav);
    const favSlugs = new Set(fav.map((c) => c.slug));
    setRecent(rec.filter((c) => !favSlugs.has(c.slug)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRemoveFavorite = async (club: SavedClub | RecentClub) => {
    await removeFavoriteClub(club.slug);
    await load();
  };

  const onSignOut = async () => {
    await logout();
    router.replace("/(discover)/account");
  };

  const onLeaveClub = async () => {
    await leaveClub();
    router.replace("/(discover)");
  };

  return (
    <Screen scroll>
      <DiscoverHero title={t("account.title")} subtitle={t("account.subtitle")} />

      {member && slug ? (
        <Card style={styles.gap}>
          <SectionTitle title={t("account.signedIn")} />
          <IconRow icon="person" label={t("account.member")} value={member.name} accent={portalInfo?.primaryColor} />
          <IconRow icon="business" label={t("account.club")} value={clubName} accent={portalInfo?.primaryColor} />
          <PrimaryButton label={t("account.openClub")} icon="home" onPress={() => router.push("/(member)")} />
          <PrimaryButton label={t("account.signOut")} variant="outline" onPress={onSignOut} />
          <PrimaryButton label={t("account.switchClub")} variant="outline" onPress={onLeaveClub} />
        </Card>
      ) : (
        <Card style={styles.gap}>
          <Text style={[styles.promptTitle, { color: colors.text }]}>{t("account.notSignedIn")}</Text>
          <Text style={[styles.promptSub, { color: colors.textMuted }]}>{t("account.notSignedInSub")}</Text>
          <PrimaryButton label={t("account.browseClubs")} icon="compass" onPress={() => router.push("/(discover)/clubs")} />
        </Card>
      )}

      <SectionTitle title={t("account.favorites")} />
      {favorites.length === 0 ? (
        <Card>
          <Text style={[styles.promptSub, { color: colors.textMuted }]}>{t("account.favoritesEmpty")}</Text>
        </Card>
      ) : (
        <ClubGrid
          clubs={favorites}
          onPress={(clubSlug) => router.push(`/club/${clubSlug}`)}
          onToggleFavorite={onRemoveFavorite}
        />
      )}

      <SectionTitle title={t("account.recent")} />
      {recent.length === 0 ? (
        <Card>
          <Text style={[styles.promptSub, { color: colors.textMuted }]}>{t("account.recentEmpty")}</Text>
        </Card>
      ) : (
        <ClubGrid clubs={recent} onPress={(clubSlug) => router.push(`/club/${clubSlug}`)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  promptTitle: { fontSize: 17, fontWeight: "700" },
  promptSub: { fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  gridItem: { width: "48%" },
});
