import { format } from "date-fns";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import {
  Badge,
  Card,
  ClassRowCard,
  IconRow,
  PremiumEmptyState,
  PrimaryButton,
  Screen,
  SectionTitle,
  Skeleton,
} from "@/lib/components";
import { QueryErrorState } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import {
  useClubProfile,
  usePublicCamps,
  usePublicPackages,
  usePublicSchedule,
} from "@/lib/discover";
import { useI18n } from "@/lib/i18n";
import { isClubSaved, saveClub, toggleSavedClub } from "@/lib/savedClubs";
import { radius, spacing, useThemeColors, withAlpha } from "@/lib/theme";

const SOCIAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  instagram: "logo-instagram",
  facebook: "logo-facebook",
  twitter: "logo-twitter",
  x: "logo-twitter",
  youtube: "logo-youtube",
  tiktok: "logo-tiktok",
  website: "globe-outline",
};

export default function ClubDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t } = useI18n();
  const { member, slug: activeSlug, switchClub } = useAuth();

  const clubSlug = slug || "";
  const { data: profile, isLoading, isError, refetch } = useClubProfile(clubSlug);
  const { data: schedule, isLoading: loadingSchedule } = usePublicSchedule(clubSlug);
  const { data: packages, isLoading: loadingPackages } = usePublicPackages(clubSlug);
  const { data: camps, isLoading: loadingCamps } = usePublicCamps(clubSlug);
  const [favorite, setFavorite] = useState(false);

  const vis = getClubTypeVisual(profile?.clubType);
  const accent = profile?.primaryColor || vis.color;

  useEffect(() => {
    if (!profile) return;
    saveClub({
      slug: profile.portalSlug,
      name: profile.name,
      clubType: profile.clubType,
      logoUrl: profile.logoUrl,
      primaryColor: profile.primaryColor,
    }).catch(() => {});
    isClubSaved(profile.portalSlug).then(setFavorite).catch(() => {});
  }, [profile]);

  const onToggleFavorite = useCallback(async () => {
    if (!profile) return;
    const next = await toggleSavedClub({
      slug: profile.portalSlug,
      name: profile.name,
      clubType: profile.clubType,
      logoUrl: profile.logoUrl,
      primaryColor: profile.primaryColor,
    });
    setFavorite(next);
  }, [profile]);

  const onJoin = async () => {
    if (!clubSlug) return;
    await switchClub(clubSlug);
    router.push("/login");
  };

  const openMaps = () => {
    if (!profile?.location) return;
    const q = encodeURIComponent(profile.location);
    Linking.openURL(`https://maps.google.com/?q=${q}`).catch(() => {});
  };

  const openPhone = () => {
    if (!profile?.phone) return;
    Linking.openURL(`tel:${profile.phone}`).catch(() => {});
  };

  if (!clubSlug) {
    return (
      <Screen>
        <QueryErrorState message={t("club.notFoundSub")} onRetry={() => router.back()} />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Skeleton height={200} />
        <Skeleton height={120} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <QueryErrorState message={t("club.notFoundSub")} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const isMemberHere = member && activeSlug === profile.portalSlug;
  const socialEntries = Object.entries(profile.socials || {}).filter(([, v]) => typeof v === "string" && v.trim());

  return (
    <Screen scroll>
      <LinearGradient colors={[accent, withAlpha(accent, 0.88)]} style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <View style={styles.heroTop}>
          <Pressable onPress={() => router.back()} style={styles.backFloating}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={onToggleFavorite} style={styles.backFloating}>
            <Ionicons name={favorite ? "heart" : "heart-outline"} size={22} color={favorite ? "#fca5a5" : "#fff"} />
          </Pressable>
        </View>
        <View style={styles.heroRow}>
          {profile.logoUrl ? (
            <Image source={{ uri: profile.logoUrl }} style={styles.logo} contentFit="contain" />
          ) : (
            <View style={[styles.logoFallback, { backgroundColor: withAlpha("#fff", 0.2) }]}>
              <Ionicons name={vis.icon} size={32} color="#fff" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{profile.name}</Text>
            <Text style={styles.heroType}>{vis.label}</Text>
            {profile.location ? (
              <Pressable onPress={openMaps} style={styles.locRow}>
                <Ionicons name="location" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.heroLoc}>{profile.location}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        {profile.welcomeMessage ? <Text style={styles.welcome}>{profile.welcomeMessage}</Text> : null}
      </LinearGradient>

      <View style={styles.stats}>
        <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: accent }]}>{profile.upcomingClassCount}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>{t("club.classes")}</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: accent }]}>{packages?.length ?? 0}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>{t("club.plans")}</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: accent }]}>{profile.memberCount}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>{t("club.members")}</Text>
        </View>
      </View>

      {isMemberHere ? (
        <PrimaryButton label={t("club.dashboard")} icon="home" onPress={() => router.push("/(member)")} />
      ) : (
        <PrimaryButton label={t("club.signIn")} icon="log-in" onPress={onJoin} />
      )}

      <SectionTitle title={t("club.upcoming")} />
      {loadingSchedule ? (
        <Skeleton height={100} />
      ) : !schedule?.length ? (
        <PremiumEmptyState title={t("explore.noClasses")} subtitle={t("explore.noClassesSub")} />
      ) : (
        schedule.slice(0, 12).map((s: { id: string; name: string; startsAt: string; capacity: number; bookedCount?: number; coachName?: string | null }) => {
          const spots = s.capacity > 0 ? `${s.bookedCount ?? 0}/${s.capacity}` : undefined;
          return (
            <ClassRowCard
              key={s.id}
              name={s.name}
              clubName={profile.name}
              time={format(new Date(s.startsAt), "EEE d MMM · HH:mm")}
              coach={s.coachName}
              spots={spots}
              accent={accent}
              onPress={() =>
                router.push({
                  pathname: "/class/[id]",
                  params: {
                    id: s.id,
                    clubSlug: profile.portalSlug,
                    clubName: profile.name,
                    startsAt: s.startsAt,
                    coach: s.coachName || "",
                    capacity: String(s.capacity),
                    booked: String(s.bookedCount ?? 0),
                  },
                })
              }
            />
          );
        })
      )}

      <SectionTitle title={t("club.membership")} />
      {loadingPackages ? (
        <Skeleton height={80} />
      ) : !packages?.length ? (
        <Card><Text style={[styles.muted, { color: colors.textMuted }]}>{t("club.contactClub")}</Text></Card>
      ) : (
        packages.map((pkg: { id: string; name: string; price: number; packageType?: string; sessionCount?: number | null; duration: number }) => (
          <Card key={pkg.id} style={styles.gap}>
            <Text style={[styles.pkgName, { color: colors.text }]}>{pkg.name}</Text>
            <Text style={[styles.pkgPrice, { color: colors.text }]}>{formatCurrency(pkg.price)}</Text>
            <Text style={[styles.muted, { color: colors.textMuted }]}>
              {pkg.packageType === "sessions"
                ? `${pkg.sessionCount} sessions`
                : `${pkg.duration} days`}
            </Text>
            {!isMemberHere ? (
              <PrimaryButton label={t("club.signInPurchase")} variant="outline" onPress={onJoin} />
            ) : null}
          </Card>
        ))
      )}

      <SectionTitle title={t("club.camps")} />
      {loadingCamps ? (
        <Skeleton height={80} />
      ) : !camps?.length ? (
        <Card><Text style={[styles.muted, { color: colors.textMuted }]}>{t("club.noEvents")}</Text></Card>
      ) : (
        camps.map((camp: { id: string; title: string; startDate: string; price?: number; description?: string }) => (
          <Card key={camp.id} style={styles.gap}>
            <IconRow
              icon="trophy"
              label={camp.title}
              value={format(new Date(camp.startDate), "EEE d MMM · HH:mm")}
              accent={accent}
            />
            {camp.price != null ? <Text style={[styles.muted, { color: colors.textMuted }]}>{formatCurrency(camp.price)}</Text> : null}
            {camp.description ? <Text style={[styles.muted, { color: colors.textMuted }]}>{camp.description}</Text> : null}
            <Badge label={t("club.publicEvent")} tone="success" />
          </Card>
        ))
      )}

      {(profile.phone || profile.location || socialEntries.length > 0) && (
        <>
          <SectionTitle title={t("club.contact")} />
          <Card style={styles.gap}>
            {profile.phone ? (
              <Pressable onPress={openPhone}>
                <IconRow icon="call" label={t("club.phone")} value={profile.phone} accent={accent} />
              </Pressable>
            ) : null}
            {profile.location ? (
              <Pressable onPress={openMaps}>
                <IconRow icon="location" label={t("club.location")} value={profile.location} accent={accent} />
              </Pressable>
            ) : null}
            {socialEntries.length > 0 ? (
              <View style={styles.socialRow}>
                {socialEntries.map(([key, url]) => (
                  <Pressable key={key} onPress={() => Linking.openURL(String(url)).catch(() => {})} style={styles.socialBtn}>
                    <Ionicons name={SOCIAL_ICONS[key.toLowerCase()] || "link-outline"} size={22} color={accent} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, padding: spacing.md },
  backBtn: { marginBottom: spacing.md, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  hero: { marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.lg, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  backFloating: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logo: { width: 72, height: 72, borderRadius: 18, backgroundColor: "#fff" },
  logoFallback: { width: 72, height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  heroName: { fontSize: 24, fontWeight: "800", color: "#fff" },
  heroType: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 2, textTransform: "capitalize" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  heroLoc: { fontSize: 13, color: "rgba(255,255,255,0.85)" },
  welcome: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: spacing.md, lineHeight: 20 },
  stats: { flexDirection: "row", gap: 10, marginVertical: spacing.md },
  stat: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1 },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLbl: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  gap: { gap: spacing.sm },
  pkgName: { fontSize: 17, fontWeight: "700" },
  pkgPrice: { fontSize: 20, fontWeight: "800" },
  muted: { fontSize: 14, lineHeight: 20 },
  socialRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  socialBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
});
