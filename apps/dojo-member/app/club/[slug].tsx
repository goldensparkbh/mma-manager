import { format } from "date-fns";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { getClubTypeVisual } from "@/lib/clubVisuals";
import {
  useClubProfile,
  usePublicCamps,
  usePublicPackages,
  usePublicSchedule,
} from "@/lib/discover";
import { saveClub } from "@/lib/savedClubs";
import { colors, radius, spacing, withAlpha } from "@/lib/theme";

export default function ClubDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { member, slug: activeSlug, switchClub } = useAuth();

  const clubSlug = slug || "";
  const { data: profile, isLoading } = useClubProfile(clubSlug);
  const { data: schedule, isLoading: loadingSchedule } = usePublicSchedule(clubSlug);
  const { data: packages, isLoading: loadingPackages } = usePublicPackages(clubSlug);
  const { data: camps, isLoading: loadingCamps } = usePublicCamps(clubSlug);

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
  }, [profile]);

  const onJoin = async () => {
    if (!clubSlug) return;
    await switchClub(clubSlug);
    router.push("/login");
  };

  const onOpenMember = () => {
    router.push("/(member)");
  };

  if (isLoading || !profile) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Skeleton height={200} />
        <Skeleton height={120} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const isMemberHere = member && activeSlug === profile.portalSlug;

  return (
    <Screen scroll>
      <LinearGradient colors={[accent, withAlpha(accent, 0.88)]} style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backFloating}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
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
            {profile.location ? <Text style={styles.heroLoc}>📍 {profile.location}</Text> : null}
          </View>
        </View>
        {profile.welcomeMessage ? <Text style={styles.welcome}>{profile.welcomeMessage}</Text> : null}
      </LinearGradient>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: accent }]}>{profile.upcomingClassCount}</Text>
          <Text style={styles.statLbl}>Classes</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: accent }]}>{packages?.length ?? 0}</Text>
          <Text style={styles.statLbl}>Plans</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: accent }]}>{camps?.length ?? 0}</Text>
          <Text style={styles.statLbl}>Events</Text>
        </View>
      </View>

      {isMemberHere ? (
        <PrimaryButton label="Go to my dashboard" icon="home" onPress={onOpenMember} />
      ) : (
        <PrimaryButton label="Sign in to book & pay" icon="log-in" onPress={onJoin} />
      )}

      <SectionTitle title="Upcoming classes" />
      {loadingSchedule ? (
        <Skeleton height={100} />
      ) : !schedule?.length ? (
        <PremiumEmptyState title="No classes scheduled" subtitle="Check back for new sessions" />
      ) : (
        schedule.slice(0, 12).map((s: { id: string; name: string; startsAt: string; capacity: number; bookedCount?: number; coachName?: string | null }) => {
          const spots =
            s.capacity > 0 ? `${s.bookedCount ?? 0}/${s.capacity} spots` : undefined;
          return (
            <ClassRowCard
              key={s.id}
              name={s.name}
              clubName={profile.name}
              time={format(new Date(s.startsAt), "EEE d MMM · HH:mm")}
              coach={s.coachName}
              spots={spots}
              accent={accent}
            />
          );
        })
      )}

      <SectionTitle title="Membership plans" />
      {loadingPackages ? (
        <Skeleton height={80} />
      ) : !packages?.length ? (
        <Card><Text style={styles.muted}>Contact the club for membership options.</Text></Card>
      ) : (
        packages.map((pkg: { id: string; name: string; price: number; packageType?: string; sessionCount?: number | null; duration: number }) => (
          <Card key={pkg.id} style={styles.gap}>
            <Text style={styles.pkgName}>{pkg.name}</Text>
            <Text style={styles.pkgPrice}>{pkg.price} BHD</Text>
            <Text style={styles.muted}>
              {pkg.packageType === "sessions"
                ? `${pkg.sessionCount} sessions`
                : `${pkg.duration} days`}
            </Text>
            {!isMemberHere ? (
              <PrimaryButton label="Sign in to purchase" variant="outline" onPress={onJoin} />
            ) : null}
          </Card>
        ))
      )}

      <SectionTitle title="Events & camps" />
      {loadingCamps ? (
        <Skeleton height={80} />
      ) : !camps?.length ? (
        <Card><Text style={styles.muted}>No public events right now.</Text></Card>
      ) : (
        camps.map((camp: { id: string; title: string; startDate: string; price?: number; description?: string }) => (
          <Card key={camp.id} style={styles.gap}>
            <IconRow
              icon="trophy"
              label={camp.title}
              value={format(new Date(camp.startDate), "EEE d MMM · HH:mm")}
              accent={accent}
            />
            {camp.price != null ? <Text style={styles.muted}>{camp.price} BHD</Text> : null}
            {camp.description ? <Text style={styles.muted}>{camp.description}</Text> : null}
            <Badge label="Public event" tone="success" />
          </Card>
        ))
      )}

      {(profile.phone || profile.location) && (
        <>
          <SectionTitle title="Contact" />
          <Card style={styles.gap}>
            {profile.phone ? <IconRow icon="call" label="Phone" value={profile.phone} accent={accent} /> : null}
            {profile.location ? <IconRow icon="location" label="Location" value={profile.location} accent={accent} /> : null}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  backBtn: { marginBottom: spacing.md, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  hero: { marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.lg, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  backFloating: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logo: { width: 72, height: 72, borderRadius: 18, backgroundColor: "#fff" },
  logoFallback: { width: 72, height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  heroName: { fontSize: 24, fontWeight: "800", color: "#fff" },
  heroType: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 2, textTransform: "capitalize" },
  heroLoc: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6 },
  welcome: { fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: spacing.md, lineHeight: 20 },
  stats: { flexDirection: "row", gap: 10, marginVertical: spacing.md },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLbl: { fontSize: 11, color: colors.textMuted, fontWeight: "600", marginTop: 2 },
  gap: { gap: spacing.sm },
  pkgName: { fontSize: 17, fontWeight: "700", color: colors.text },
  pkgPrice: { fontSize: 20, fontWeight: "800", color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
});
