import { LinearGradient } from "expo-linear-gradient";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ClubLogo } from "@/lib/clubLogo";
import { useTypography } from "@/lib/fonts";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useI18n } from "@/lib/i18n";
import {
  WEEKDAY_KEYS,
  type OperatingHours,
  type WeekdayKey,
  formatDayHours,
} from "@/lib/operatingHours";
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

export type ClubProfileData = {
  name: string;
  clubType?: string;
  location?: string | null;
  phone?: string | null;
  welcomeMessage?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  socials?: Record<string, string>;
  operatingHours?: OperatingHours | null;
  hoursFromSchedule?: boolean;
};

type IonName = ComponentProps<typeof Ionicons>["name"];

function HeroSocialBtn({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: IonName;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.heroSocialBtn}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={20} color="#fff" />
    </Pressable>
  );
}

function HeroHoursChips({ profile }: { profile: ClubProfileData }) {
  const { t } = useI18n();
  const typo = useTypography();
  const hasHours = !!profile.operatingHours && WEEKDAY_KEYS.some((k) => profile.operatingHours?.[k]);

  if (!hasHours) return null;

  const dayLabels: Record<WeekdayKey, string> = {
    sunday: t("days.sunday"),
    monday: t("days.monday"),
    tuesday: t("days.tuesday"),
    wednesday: t("days.wednesday"),
    thursday: t("days.thursday"),
    friday: t("days.friday"),
    saturday: t("days.saturday"),
  };

  const closedLabel = t("club.hoursClosed");

  return (
    <View style={styles.heroHoursSection}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.hoursChipScroll}
        contentContainerStyle={styles.hoursChipRow}
      >
        {WEEKDAY_KEYS.map((key) => {
          const day = profile.operatingHours![key];
          if (!day) return null;
          const timeLabel = formatDayHours(day, closedLabel);
          const isClosed = !day || day.closed || timeLabel === closedLabel;
          return (
            <View key={key} style={[styles.hoursChip, isClosed && styles.hoursChipClosed]}>
              <Text style={[styles.hoursChipDay, typo.style("bold", { textAlign: "center", color: "#fff" })]} numberOfLines={1}>
                {dayLabels[key]}
              </Text>
              <Text
                style={[
                  styles.hoursChipTime,
                  isClosed && styles.hoursChipTimeClosed,
                  typo.style("semibold", { textAlign: "center", color: "rgba(255,255,255,0.92)" }),
                ]}
                numberOfLines={1}
              >
                {timeLabel}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ClubProfileHero({
  profile,
  accent,
  topInset = 0,
  onBack,
  onToggleFavorite,
  favorite,
}: {
  profile: ClubProfileData;
  accent: string;
  topInset?: number;
  onBack?: () => void;
  onToggleFavorite?: () => void;
  favorite?: boolean;
}) {
  const { t } = useI18n();
  const typo = useTypography();
  const vis = getClubTypeVisual(profile.clubType);
  const heroAccent = profile.primaryColor || accent || vis.color;
  const showTopBar = !!onBack || !!onToggleFavorite;

  const location = profile.location?.trim();
  const phone = profile.phone?.trim();
  const socialEntries = Object.entries(profile.socials || {}).filter(([, v]) => typeof v === "string" && v.trim());
  const hasActions = !!location || !!phone || socialEntries.length > 0;

  const openMaps = () => {
    if (!location) return;
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(location)}`).catch(() => {});
  };

  const callPhone = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  return (
    <View style={styles.heroWrap}>
      <LinearGradient
        colors={[heroAccent, withAlpha(heroAccent, 0.88), withAlpha(vis.color, 0.92)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroGradient, { paddingTop: topInset + spacing.xs }]}
      >
        {showTopBar ? (
          <View style={styles.heroTopCluster}>
            <View style={styles.topBar}>
              {onBack ? (
                <Pressable onPress={onBack} style={styles.heroIconBtn}>
                  <Ionicons name="arrow-back" size={22} color="#fff" />
                </Pressable>
              ) : (
                <View style={styles.heroIconSpacer} />
              )}
              {onToggleFavorite ? (
                <Pressable onPress={onToggleFavorite} style={styles.heroIconBtn}>
                  <Ionicons
                    name={favorite ? "heart" : "heart-outline"}
                    size={22}
                    color={favorite ? "#fecaca" : "#fff"}
                  />
                </Pressable>
              ) : (
                <View style={styles.heroIconSpacer} />
              )}
            </View>
            <View style={[styles.heroLogoFrame, styles.heroLogoOverlap]}>
              <View style={styles.heroLogoClip}>
                <ClubLogo logoUrl={profile.logoUrl} size={92} fill contentFit="cover" />
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.heroLogoFrame, styles.heroLogoStandalone]}>
            <View style={styles.heroLogoClip}>
              <ClubLogo logoUrl={profile.logoUrl} size={92} fill contentFit="cover" />
            </View>
          </View>
        )}

        <View style={styles.heroContent}>
          <Text style={[styles.heroClubName, typo.style("bold", { textAlign: "center" })]}>
            {profile.name}
          </Text>
        </View>

        {hasActions ? (
          <View style={styles.heroActionsRow}>
            {location ? (
              <HeroSocialBtn
                icon="location-outline"
                accessibilityLabel={t("club.location")}
                onPress={openMaps}
              />
            ) : null}
            {phone ? (
              <HeroSocialBtn
                icon="call-outline"
                accessibilityLabel={t("club.contact")}
                onPress={callPhone}
              />
            ) : null}
            {socialEntries.map(([key, url]) => (
              <HeroSocialBtn
                key={key}
                icon={SOCIAL_ICONS[key.toLowerCase()] || "link-outline"}
                onPress={() => Linking.openURL(String(url)).catch(() => {})}
              />
            ))}
          </View>
        ) : null}

        <HeroHoursChips profile={profile} />
      </LinearGradient>
    </View>
  );
}

/** @deprecated Integrated into ClubProfileHero */
export function ClubLocationSection(_props: { location?: string | null; accent: string }) {
  return null;
}

/** @deprecated Integrated into ClubProfileHero */
export function ClubContactSection(_props: { profile: ClubProfileData; accent: string }) {
  return null;
}

export function OperatingHoursTable({
  hours,
  derived,
  accent,
  compact,
  onDark,
}: {
  hours: OperatingHours;
  derived?: boolean;
  accent: string;
  compact?: boolean;
  onDark?: boolean;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const typo = useTypography();
  const textColor = onDark ? "#fff" : colors.text;
  const mutedColor = onDark ? "rgba(255,255,255,0.75)" : colors.textMuted;
  const borderColor = onDark ? "rgba(255,255,255,0.2)" : colors.border;

  const dayLabels: Record<WeekdayKey, string> = {
    sunday: t("days.sunday"),
    monday: t("days.monday"),
    tuesday: t("days.tuesday"),
    wednesday: t("days.wednesday"),
    thursday: t("days.thursday"),
    friday: t("days.friday"),
    saturday: t("days.saturday"),
  };

  return (
    <View style={[styles.hoursWrap, compact && styles.hoursWrapCompact, { borderColor }]}>
      <View style={[styles.hoursHead, compact && styles.hoursHeadCompact]}>
        <Text style={[styles.hoursTitle, compact && styles.hoursTitleCompact, { color: textColor }, typo.style("bold")]}>
          {t("club.hours")}
        </Text>
        {derived ? (
          <Text style={[styles.hoursHint, { color: mutedColor }, typo.style("regular")]}>{t("club.hoursFromSchedule")}</Text>
        ) : null}
      </View>
      {WEEKDAY_KEYS.map((key) => {
        const day = hours[key];
        if (!day) return null;
        return (
          <View key={key} style={[styles.hoursRow, compact && styles.hoursRowCompact, { borderTopColor: borderColor }]}>
            <Text style={[styles.hoursDay, compact && styles.hoursDayCompact, { color: textColor }, typo.style("semibold")]}>{dayLabels[key]}</Text>
            <Text style={[styles.hoursTime, compact && styles.hoursTimeCompact, { color: mutedColor }, typo.style("regular")]}>
              {formatDayHours(day, t("club.hoursClosed"))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function ClubContentSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  return (
    <View style={styles.contentSection}>
      <Text style={[styles.contentSectionTitle, { color: colors.text }, typo.style("bold")]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { marginHorizontal: -spacing.md },
  heroGradient: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  heroTopCluster: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  heroIconSpacer: { width: 40 },
  heroContent: { alignItems: "center", paddingBottom: spacing.xs, marginTop: spacing.xs },
  heroLogoFrame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLogoOverlap: {
    marginTop: -40,
    zIndex: 8,
  },
  heroLogoStandalone: {
    alignSelf: "center",
    marginBottom: spacing.xs,
  },
  heroLogoClip: {
    width: 94,
    height: 94,
    borderRadius: 47,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  heroClubName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 30,
    textAlign: "center",
    alignSelf: "center",
    maxWidth: "100%",
  },
  heroActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroSocialBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroHoursSection: { marginTop: spacing.md },
  hoursChipScroll: { marginHorizontal: -spacing.md },
  hoursChipRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  hoursChip: {
    minWidth: 76,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
  },
  hoursChipClosed: { opacity: 0.55 },
  hoursChipDay: { fontSize: 10, fontWeight: "700", color: "#fff", textTransform: "capitalize" },
  hoursChipTime: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.92)", marginTop: 2 },
  hoursChipTimeClosed: { fontSize: 10 },
  hoursWrap: { borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  hoursWrapCompact: { marginTop: 0 },
  hoursHead: { paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  hoursHeadCompact: { paddingVertical: 6 },
  hoursTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  hoursTitleCompact: { fontSize: 11 },
  hoursHint: { fontSize: 10 },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  hoursRowCompact: { paddingVertical: 6 },
  hoursDay: { fontSize: 13, fontWeight: "600", flex: 1 },
  hoursDayCompact: { fontSize: 12 },
  hoursTime: { fontSize: 13, fontWeight: "500" },
  hoursTimeCompact: { fontSize: 12 },
  contentSection: { marginTop: spacing.md },
  contentSectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: spacing.sm },
});
