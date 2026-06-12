import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import {
  Badge,
  Card,
  CategoryChip,
  ClassRowCard,
  IconRow,
  PackageGridCard,
  PremiumEmptyState,
  PrimaryButton,
  QuickAction,
  Screen,
  SectionTitle,
  Skeleton,
} from "@/lib/components";
import {
  ClubContentSection,
  ClubProfileHero,
  type ClubProfileData,
} from "@/lib/clubProfileLayout";
import {
  collectSportTypesFromSchedule,
  filterScheduleBySport,
} from "@/lib/classSportFilter";
import { QueryErrorState } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import {
  useClubProfile,
  useClubTypes,
  usePublicCamps,
  usePublicCoaches,
  usePublicPackages,
  usePublicSchedule,
} from "@/lib/discover";
import { useI18n } from "@/lib/i18n";
import { useBookings, useCamps, useCheckout, useRegisterCamp } from "@/lib/hooks";
import { BookingsIllustration, ClassesIllustration } from "@/lib/illustrations";
import { deriveHoursFromSchedule, parseOperatingHours } from "@/lib/operatingHours";
import { saveRecentClub } from "@/lib/recentClubs";
import { isClubFavorite, toggleFavoriteClub } from "@/lib/savedClubs";
import { spacing, useThemeColors, withAlpha } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import type { Booking, CampEvent } from "@/lib/types";

const PAYMENT_RETURN = Linking.createURL("payment-result");

type ScheduleItem = {
  id: string;
  name: string;
  startsAt: string;
  capacity: number;
  bookedCount?: number;
  coachName?: string | null;
  location?: string | null;
};

export function ClubDetailScreen({
  slug,
  showBack = true,
}: {
  slug: string;
  showBack?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t, clubTypeName } = useI18n();
  const { show } = useToast();
  const { member, slug: activeSlug, switchClub, refresh, activeSubscription } = useAuth();
  const checkout = useCheckout();
  const registerCamp = useRegisterCamp();
  const [payingPackageId, setPayingPackageId] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [sportFilter, setSportFilter] = useState("");

  const clubSlug = slug || "";
  const { data: profile, isLoading, isError, refetch } = useClubProfile(clubSlug);
  const { data: schedule, isLoading: loadingSchedule, refetch: refetchSchedule } = usePublicSchedule(clubSlug);
  const { data: packages, isLoading: loadingPackages } = usePublicPackages(clubSlug);
  const { data: publicCamps, isLoading: loadingPublicCamps } = usePublicCamps(clubSlug);
  const { data: coaches, isLoading: loadingCoaches } = usePublicCoaches(clubSlug);
  const { data: clubTypes } = useClubTypes();
  const { data: memberCamps, isLoading: loadingMemberCamps, refetch: refetchMemberCamps } = useCamps();
  const { data: bookingsData, refetch: refetchBookings, isRefetching: refetchingBookings } = useBookings();

  const vis = getClubTypeVisual(profile?.clubType);
  const accent = profile?.primaryColor || vis.color;
  const isMemberHere = !!(member && activeSlug === profile?.portalSlug);

  const { operatingHours, hoursFromSchedule } = useMemo(() => {
    const configured = parseOperatingHours(profile?.operatingHours);
    if (configured) return { operatingHours: configured, hoursFromSchedule: false };
    const derived = deriveHoursFromSchedule(schedule ?? []);
    return { operatingHours: derived, hoursFromSchedule: !!derived };
  }, [profile?.operatingHours, schedule]);

  const clubProfileData: ClubProfileData | null = profile
    ? {
        name: profile.name,
        clubType: profile.clubType,
        location: profile.location,
        phone: profile.phone,
        welcomeMessage: profile.welcomeMessage,
        logoUrl: profile.logoUrl,
        primaryColor: profile.primaryColor,
        socials: profile.socials,
        operatingHours,
        hoursFromSchedule,
      }
    : null;

  const sportTypes = useMemo(() => {
    if (!schedule?.length || !clubTypes?.length) return [];
    return collectSportTypesFromSchedule(schedule, clubTypes, profile?.clubType);
  }, [schedule, clubTypes, profile?.clubType]);

  const filteredSchedule = useMemo(() => {
    if (!schedule?.length) return [];
    return filterScheduleBySport(schedule, sportFilter, clubTypes ?? [], profile?.clubType);
  }, [schedule, sportFilter, clubTypes, profile?.clubType]);

  const nextBooking = useMemo(() => {
    const bookings: Booking[] = bookingsData ?? [];
    return bookings
      .filter(
        (b) =>
          (b.status === "confirmed" || b.status === "waitlist") &&
          b.startsAt &&
          new Date(b.startsAt) > new Date(),
      )
      .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime())[0];
  }, [bookingsData]);

  const camps: CampEvent[] = isMemberHere ? (memberCamps ?? []) : (publicCamps ?? []);
  const loadingCamps = isMemberHere ? loadingMemberCamps : loadingPublicCamps;

  useEffect(() => {
    if (!profile) return;
    saveRecentClub({
      slug: profile.portalSlug,
      name: profile.name,
      clubType: profile.clubType,
      logoUrl: profile.logoUrl,
      primaryColor: profile.primaryColor,
    }).catch(() => {});
    isClubFavorite(profile.portalSlug).then(setFavorite).catch(() => {});
  }, [profile]);

  const onToggleFavorite = useCallback(async () => {
    if (!profile) return;
    const next = await toggleFavoriteClub({
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

  const onBuyPackage = useCallback(
    async (packageId: string) => {
      setPayingPackageId(packageId);
      try {
        const result = await checkout.mutateAsync({
          packageId,
          redirectUrl: PAYMENT_RETURN,
        });
        if (result.url) {
          const browser = await WebBrowser.openAuthSessionAsync(result.url, PAYMENT_RETURN);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (browser.type === "success" && browser.url) {
            const parsed = Linking.parse(browser.url);
            if (parsed.queryParams?.tap_id) {
              await refresh();
              show(t("member.paymentComplete"), "success");
            }
          }
        }
      } catch (e) {
        show((e as Error).message, "error");
      } finally {
        setPayingPackageId(null);
      }
    },
    [checkout, refresh, show, t],
  );

  const onRegisterCamp = async (id: string) => {
    try {
      await registerCamp.mutateAsync(id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      show(t("member.register"), "success");
    } catch (e) {
      show((e as Error).message, "error");
    }
  };

  const onRefresh = () => {
    refetch();
    refetchSchedule();
    if (isMemberHere) {
      refetchBookings();
      refetchMemberCamps();
    }
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
        <Skeleton height={180} style={{ marginHorizontal: -spacing.md }} />
        <Skeleton height={44} style={{ marginTop: spacing.sm }} />
        <Skeleton height={44} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  if (isError || !profile || !clubProfileData) {
    return (
      <Screen>
        <QueryErrorState message={t("club.notFoundSub")} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const renderClassRow = (s: ScheduleItem) => {
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
              mode: isMemberHere ? "member" : undefined,
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
  };

  return (
    <Screen
      scroll
      padTop={false}
      style={{ paddingTop: 0 }}
      refreshing={isMemberHere ? refetchingBookings : undefined}
      onRefresh={isMemberHere ? onRefresh : undefined}
    >
      <ClubProfileHero
        profile={clubProfileData}
        accent={accent}
        topInset={insets.top}
        onBack={showBack ? () => router.back() : undefined}
        onToggleFavorite={onToggleFavorite}
        favorite={favorite}
      />

      {isMemberHere ? (
        <>
          <View style={styles.quickRow}>
            <QuickAction
              icon="calendar"
              label={t("tabs.classes")}
              onPress={() => router.push("/(member)/classes")}
              accent={accent}
            />
            <QuickAction
              icon="qr-code"
              label={t("member.checkInQr")}
              onPress={() => router.push("/(member)/profile")}
              accent={accent}
            />
            <QuickAction
              icon="card"
              label={t("tabs.pay")}
              onPress={() => router.push("/(member)/payments")}
              accent={accent}
            />
            <QuickAction
              icon="bookmark"
              label={t("tabs.bookings")}
              onPress={() => router.push("/(member)/bookings")}
              accent={accent}
            />
          </View>

          <Card style={{ ...styles.membershipCard, borderColor: withAlpha(accent, 0.35) }}>
            <SectionTitle title={t("member.membership")} />
            {activeSubscription ? (
              <>
                <IconRow icon="ribbon" label={t("member.plan")} value={activeSubscription.planName} accent={accent} />
                {activeSubscription.packageType === "sessions" ? (
                  <IconRow
                    icon="fitness"
                    label={t("member.sessionsLeft")}
                    value={String(activeSubscription.sessionsRemaining ?? 0)}
                    accent={accent}
                  />
                ) : activeSubscription.endDate ? (
                  <IconRow
                    icon="time"
                    label={t("member.validUntil")}
                    value={format(new Date(activeSubscription.endDate), "d MMM yyyy")}
                    accent={accent}
                  />
                ) : null}
                <Badge label={t("member.active")} tone="success" />
              </>
            ) : (
              <>
                <PremiumEmptyState
                  title={t("member.noPlan")}
                  subtitle={t("member.noPlanSub")}
                  illustration={<ClassesIllustration size={140} />}
                />
                <PrimaryButton
                  label={t("member.viewPackages")}
                  icon="card"
                  onPress={() => router.push("/(member)/payments")}
                />
              </>
            )}
          </Card>

          <View style={styles.inlineSection}>
            <SectionTitle title={t("member.nextClass")} />
            {nextBooking ? (
              <Card>
                <IconRow
                  icon="calendar"
                  label={nextBooking.sessionName || "Class"}
                  value={
                    nextBooking.startsAt
                      ? format(new Date(nextBooking.startsAt), "EEE d MMM · HH:mm")
                      : ""
                  }
                  accent={accent}
                />
                <Badge
                  label={nextBooking.status}
                  tone={nextBooking.status === "waitlist" ? "warning" : "success"}
                />
              </Card>
            ) : (
              <PremiumEmptyState
                title={t("member.nothingBooked")}
                subtitle={t("member.nothingBookedSub")}
                illustration={<BookingsIllustration size={130} />}
              />
            )}
          </View>
        </>
      ) : (
        <PrimaryButton label={t("club.signIn")} icon="log-in" onPress={onJoin} />
      )}

      <ClubContentSection title={t("club.upcoming")}>
        {sportTypes.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sportChipScroll}
            contentContainerStyle={styles.sportChipRow}
          >
            <CategoryChip
              label={t("clubs.all")}
              active={!sportFilter}
              color={accent}
              onPress={() => setSportFilter("")}
            />
            {sportTypes.map((typeId) => {
              const type = clubTypes?.find((ct) => ct.id === typeId);
              const label = type ? clubTypeName(type.nameEn, type.nameAr) : typeId.replace(/_/g, " ");
              return (
                <CategoryChip
                  key={typeId}
                  label={label}
                  active={sportFilter === typeId}
                  color={accent}
                  onPress={() => setSportFilter(sportFilter === typeId ? "" : typeId)}
                />
              );
            })}
          </ScrollView>
        ) : null}
        {loadingSchedule ? (
          <Skeleton height={100} />
        ) : !filteredSchedule.length ? (
          <PremiumEmptyState title={t("explore.noClasses")} subtitle={t("explore.noClassesSub")} />
        ) : (
          filteredSchedule.slice(0, 12).map(renderClassRow)
        )}
      </ClubContentSection>

      <ClubContentSection title={t("club.membership")}>
        {loadingPackages ? (
          <View style={styles.pkgGrid}>
            <Skeleton height={160} style={styles.pkgGridItem} />
            <Skeleton height={160} style={styles.pkgGridItem} />
          </View>
        ) : !packages?.length ? (
          <Card>
            <Text style={[styles.muted, { color: colors.textMuted }]}>{t("club.contactClub")}</Text>
          </Card>
        ) : (
          <View style={styles.pkgGrid}>
            {packages.map((pkg) => (
              <View key={pkg.id} style={styles.pkgGridItem}>
                <PackageGridCard
                  name={pkg.name}
                  price={pkg.price}
                  packageType={pkg.packageType}
                  sessionCount={pkg.sessionCount}
                  duration={pkg.duration}
                  accent={accent}
                  actionLabel={isMemberHere ? t("member.payNow") : t("club.signInPurchase")}
                  actionPrimary={!!isMemberHere}
                  actionLoading={payingPackageId === pkg.id && checkout.isPending}
                  onAction={() => (isMemberHere ? onBuyPackage(pkg.id) : onJoin())}
                />
              </View>
            ))}
          </View>
        )}
      </ClubContentSection>

      <ClubContentSection title={t("club.camps")}>
        {loadingCamps ? (
          <Skeleton height={80} />
        ) : !camps.length ? (
          <Card>
            <Text style={[styles.muted, { color: colors.textMuted }]}>{t("club.noEvents")}</Text>
          </Card>
        ) : (
          camps.map((camp) => (
            <Card key={camp.id} style={styles.gap}>
              <IconRow
                icon="trophy"
                label={camp.title}
                value={format(new Date(camp.startDate), "EEE d MMM · HH:mm")}
                accent={accent}
              />
              {camp.price != null ? (
                <Text style={[styles.muted, { color: colors.textMuted }]}>{formatCurrency(camp.price)}</Text>
              ) : null}
              {"description" in camp && camp.description ? (
                <Text style={[styles.muted, { color: colors.textMuted }]}>{String(camp.description)}</Text>
              ) : null}
              {isMemberHere ? (
                <PrimaryButton
                  label={t("member.register")}
                  icon="checkmark-circle"
                  loading={registerCamp.isPending}
                  onPress={() => onRegisterCamp(camp.id)}
                />
              ) : (
                <Badge label={t("club.publicEvent")} tone="success" />
              )}
            </Card>
          ))
        )}
      </ClubContentSection>

      <ClubContentSection title={t("club.coaches")}>
        {loadingCoaches ? (
          <Skeleton height={80} />
        ) : !coaches?.length ? (
          <Card>
            <Text style={[styles.muted, { color: colors.textMuted }]}>{t("club.noCoaches")}</Text>
          </Card>
        ) : (
          coaches.map((coach) => (
            <Card key={coach.id} style={styles.gap}>
              <IconRow icon="person" label={coach.name} value={coach.bio || ""} accent={accent} />
            </Card>
          ))
        )}
      </ClubContentSection>

      {isMemberHere ? (
        <Pressable style={[styles.qrCta, { backgroundColor: accent }]} onPress={() => router.push("/(member)/profile")}>
          <Text style={styles.qrTitle}>{t("member.checkInQr")}</Text>
          <Text style={styles.qrSub}>{t("member.checkInQrSub")}</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, padding: spacing.md },
  quickRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  membershipCard: { borderWidth: 1.5, gap: spacing.sm, marginTop: spacing.sm },
  inlineSection: { marginTop: spacing.md },
  gap: { gap: spacing.sm },
  pkgGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pkgGridItem: { width: "48%" },
  muted: { fontSize: 14, lineHeight: 20 },
  sportChipScroll: { marginHorizontal: -spacing.md, marginBottom: spacing.sm },
  sportChipRow: { gap: spacing.sm, paddingHorizontal: spacing.md },
  qrCta: {
    borderRadius: 18,
    padding: 22,
    marginTop: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  qrTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  qrSub: { color: "rgba(255,255,255,0.88)", fontSize: 13, marginTop: 6 },
});
