import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useBranding } from "./branding";
import { NAWADY_BRAND } from "./brand";
import { getClubTypeImageSource } from "./clubTypeImages";
import { resolveImageUrl } from "./resolveUrl";
import { ClubLogo } from "./clubLogo";
import { getClubTypeVisual } from "./clubVisuals";
import { formatCurrency } from "./format";
import { useTypography } from "./fonts";
import { HeroWave } from "./hero-wave";
import { useI18n } from "./i18n";
import { NawadyLogo } from "./nawady-logo";
import { resolveImageUrl } from "./resolveUrl";
import { colors as staticColors, radius, spacing, useThemeColors, withAlpha } from "./theme";

type IonName = ComponentProps<typeof Ionicons>["name"];

export function Screen({
  children,
  style,
  scroll,
  refreshing,
  onRefresh,
  padBottom = true,
  padTop = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padBottom?: boolean;
  padTop?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const padding = {
    paddingTop: padTop ? spacing.md : 0,
    paddingBottom: padBottom ? insets.bottom + 80 : spacing.md,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.bg }, style]}
        contentContainerStyle={[styles.scrollContent, padding]}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.screen, { backgroundColor: colors.bg }, padding, style]}>{children}</View>;
}

export function ClubHeader({
  clubName,
  logoUrl,
  accent,
  subtitle,
  memberName,
}: {
  clubName: string;
  logoUrl?: string;
  accent: string;
  subtitle?: string;
  memberName?: string;
}) {
  return (
    <LinearGradient colors={[accent, withAlpha(accent, 0.85)]} style={styles.header}>
      <View style={styles.headerRow}>
        <ClubLogo logoUrl={logoUrl} size={56} style={styles.logo} />
        <View style={styles.headerText}>
          <Text style={styles.clubName}>{clubName}</Text>
          {memberName ? <Text style={styles.memberName}>{memberName}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    </LinearGradient>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const colors = useThemeColors();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function SectionTitle({ title, action, centered }: { title: string; action?: React.ReactNode; centered?: boolean }) {
  const colors = useThemeColors();
  const typo = useTypography();
  return (
    <View style={[styles.sectionRow, centered && styles.sectionRowCentered]}>
      <Text
        style={[
          styles.sectionTitle,
          centered && styles.sectionTitleCentered,
          { color: colors.text },
          typo.style("bold", centered ? { textAlign: "center" } : undefined),
        ]}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "danger";
  icon?: IonName;
}) {
  const { accent } = useBranding();
  const colors = useThemeColors();
  const isOutline = variant === "outline";
  const isDanger = variant === "danger";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        !isOutline && !isDanger && { backgroundColor: accent },
        isOutline && styles.btnOutline,
        isDanger && styles.btnDanger,
        (disabled || loading) && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? accent : "#fff"} />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Ionicons name={icon} size={18} color={isOutline ? accent : isDanger ? colors.danger : "#fff"} /> : null}
          <Text style={[styles.btnText, isOutline && { color: accent }, isDanger && styles.btnTextDanger]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function QuickAction({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: IonName;
  label: string;
  onPress: () => void;
  accent: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.85 }]}>
      <View style={[styles.quickIcon, { backgroundColor: withAlpha(accent, 0.14) }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

export function PremiumEmptyState({
  title,
  subtitle,
  illustration,
}: {
  title: string;
  subtitle?: string;
  illustration?: React.ReactNode;
}) {
  return (
    <View style={styles.premiumEmpty}>
      {illustration}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

export function IconRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: IonName;
  label: string;
  value: string;
  accent?: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.iconRow}>
      <View style={[styles.iconCircle, { backgroundColor: withAlpha(accent || colors.primary, 0.12) }]}>
        <Ionicons name={icon} size={18} color={accent || colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.iconLabel}>{label}</Text>
        <Text style={styles.iconValue}>{value}</Text>
      </View>
    </View>
  );
}

export function Badge({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const colors = useThemeColors();
  const bg =
    tone === "success" ? "#dcfce7" : tone === "warning" ? "#fef3c7" : tone === "danger" ? colors.dangerBg : colors.bg;
  const fg =
    tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "danger" ? colors.danger : colors.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Skeleton({ height = 80, style }: { height?: number; style?: ViewStyle }) {
  return <View style={[styles.skeleton, { height }, style]} />;
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

export function ClubGridCard({
  name,
  sportTypeIds = [],
  location,
  logoUrl,
  accent,
  typeIcon,
  typeColor,
  typeColorSoft,
  onPress,
  variant = "grid",
  isFavorite,
  onToggleFavorite,
}: {
  name: string;
  sportTypeIds?: string[];
  location?: string | null;
  logoUrl?: string | null;
  accent: string;
  typeIcon: IonName;
  typeColor: string;
  typeColorSoft: string;
  onPress: () => void;
  variant?: "grid" | "list";
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  const { t } = useI18n();
  const logoWidth = variant === "list" ? 88 : 76;

  const uniqueIds = useMemo(() => [...new Set(sportTypeIds.filter(Boolean))], [sportTypeIds]);
  const sportIds = uniqueIds.filter((id) => id !== "hybrid");

  const showMultipleSports =
    (uniqueIds.length === 1 && uniqueIds[0] === "hybrid") || sportIds.length > 2;

  const typeLabels = showMultipleSports
    ? []
    : sportIds.slice(0, 2).map((id) => getClubTypeVisual(id).label);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.browseCard,
        variant === "list" && styles.browseCardList,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.94 },
      ]}
    >
      <View style={[styles.browseCardLogoWrap, { width: logoWidth, minHeight: logoWidth }]}>
        <ClubLogo logoUrl={logoUrl} size={logoWidth} fill style={styles.browseCardLogo} />
        {onToggleFavorite ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite();
            }}
            hitSlop={8}
            style={styles.browseCardFav}
          >
            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={14} color={isFavorite ? "#ef4444" : colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.browseCardBody, typo.isRtl && styles.browseCardBodyRtl]}>
        <Text
          style={[styles.browseCardName, { color: colors.text }, typo.style("bold"), styles.browseCardNameFill]}
          numberOfLines={variant === "list" ? 2 : 2}
        >
          {name}
        </Text>

        {showMultipleSports ? (
          <View style={[styles.browseCardTypePill, { backgroundColor: withAlpha(accent, 0.12) }]}>
            <Text style={[styles.browseCardTypeText, { color: accent }, typo.style("semibold")]} numberOfLines={1}>
              {t("explore.multipleSports")}
            </Text>
          </View>
        ) : typeLabels.length > 0 ? (
          <View style={styles.browseCardTypeRow}>
            {typeLabels.map((label) => (
              <View key={label} style={[styles.browseCardTypePill, { backgroundColor: withAlpha(accent, 0.12) }]}>
                <Text style={[styles.browseCardTypeText, { color: accent }, typo.style("semibold")]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {location ? (
          <View style={[styles.browseCardLocRow, typo.isRtl && styles.browseCardLocRowRtl]}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text
              style={[styles.browseCardLoc, { color: colors.textMuted }, typo.style("regular"), styles.browseCardNameFill]}
              numberOfLines={1}
            >
              {location.split(",")[0]}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function PackageGridCard({
  name,
  price,
  packageType,
  sessionCount,
  duration,
  accent,
  actionLabel,
  onAction,
  actionLoading,
  actionPrimary,
}: {
  name: string;
  price: number;
  packageType?: string;
  sessionCount?: number | null;
  duration?: number;
  accent: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  actionPrimary?: boolean;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  const { t, locale } = useI18n();
  const meta =
    packageType === "sessions"
      ? t("member.sessionsPkg", { count: sessionCount ?? 0 })
      : t("member.daysValidity", { days: duration ?? 0 });

  return (
    <View style={[styles.pkgGridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <LinearGradient
        colors={[accent, withAlpha(accent, 0.7)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pkgGridHeader}
      />
      <View style={styles.pkgGridBody}>
        <Text style={[styles.pkgGridName, { color: colors.text }, typo.style("bold", { textAlign: "center" })]} numberOfLines={2}>
          {name}
        </Text>
        <View style={[styles.pkgGridMetaPill, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <Text style={[styles.pkgGridMeta, { color: accent }, typo.style("semibold", { textAlign: "center" })]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Text style={[styles.pkgGridPrice, { color: colors.text }, typo.style("bold", { textAlign: "center" })]}>
          {formatCurrency(price, "BHD", locale)}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            disabled={actionLoading}
            style={[
              styles.pkgGridAction,
              actionPrimary
                ? { backgroundColor: accent, borderColor: accent }
                : { borderColor: withAlpha(accent, 0.35) },
              actionLoading && styles.pkgGridActionDisabled,
            ]}
          >
            {actionLoading ? (
              <ActivityIndicator color={actionPrimary ? "#fff" : accent} size="small" />
            ) : (
              <Text
                style={[
                  styles.pkgGridActionText,
                  { color: actionPrimary ? "#fff" : accent },
                  typo.style("semibold", { textAlign: "center" }),
                ]}
              >
                {actionLabel}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ClubCard({
  name,
  clubType,
  location,
  logoUrl,
  accent,
  typeIcon,
  typeColor,
  typeColorSoft,
  upcomingCount,
  nextClassAt,
  onPress,
  compact,
  isFavorite,
  onToggleFavorite,
}: {
  name: string;
  clubType: string;
  location?: string | null;
  logoUrl?: string | null;
  accent: string;
  typeIcon: IonName;
  typeColor: string;
  typeColorSoft: string;
  upcomingCount?: number;
  nextClassAt?: string | null;
  onPress: () => void;
  compact?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.clubCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        compact && styles.clubCardCompact,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={[styles.clubCardAccent, { backgroundColor: accent }]} />
      <View style={styles.clubCardBody}>
        <ClubLogo logoUrl={logoUrl} size={56} style={styles.clubCardLogo} />
        <View style={{ flex: 1, alignSelf: "stretch" }}>
          <Text
            style={[styles.clubCardName, { color: colors.text }, compact && { fontSize: 15 }, typo.style("bold"), styles.browseCardNameFill]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={[styles.clubCardMeta, { color: colors.textMuted }, typo.style("regular"), styles.browseCardNameFill]} numberOfLines={1}>
            {clubType.replace(/_/g, " ")}
            {location ? ` · ${location}` : ""}
          </Text>
          {!compact && upcomingCount != null ? (
            <Text style={[styles.clubCardStat, { color: accent }]}>
              {upcomingCount > 0
                ? `${upcomingCount} upcoming class${upcomingCount === 1 ? "" : "es"}`
                : "View schedule"}
            </Text>
          ) : null}
        </View>
        {onToggleFavorite ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite();
            }}
            hitSlop={8}
            style={styles.favBtn}
          >
            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={20} color={isFavorite ? "#ef4444" : colors.textMuted} />
          </Pressable>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

export function CategoryChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active?: boolean;
  color?: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const bg = active ? color || colors.primary : colors.bg;
  const fg = active ? "#fff" : colors.text;
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const EXPLORE_HERO_IMAGE = require("../assets/illustrations/explore-hero.png");

/** Circular Nawady mark — brand gradient with stylized N */
export function NawadyMark({ size = 44 }: { size?: number }) {
  return (
    <LinearGradient
      colors={[NAWADY_BRAND.primaryLight, NAWADY_BRAND.primary, NAWADY_BRAND.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.nawadyMark,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text
        style={[
          styles.nawadyMarkLetter,
          { fontSize: Math.round(size * 0.48), lineHeight: Math.round(size * 0.52) },
        ]}
      >
        N
      </Text>
    </LinearGradient>
  );
}

export function ExploreTopBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.exploreTopBarHero, { marginHorizontal: -spacing.md, marginBottom: spacing.sm }]}>
      <Image source={EXPLORE_HERO_IMAGE} style={styles.exploreTopBarBg} contentFit="cover" />
      <LinearGradient
        colors={["rgba(0, 74, 173, 0.45)", "rgba(0, 53, 128, 0.88)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.exploreTopBarContent, { paddingTop: insets.top + 14 }]}>
        <View style={styles.exploreTopRow}>
          <NawadyMark size={46} />
          <View style={styles.exploreSearchWrap}>
            <SearchInput value={value} onChangeText={onChangeText} placeholder={placeholder} onDark rounded compact />
          </View>
        </View>
      </View>
      <HeroWave color={colors.bg} height={36} />
    </View>
  );
}

export function SportCategoryImageCard({
  label,
  count,
  clubTypeId,
  imageUrl,
  width,
  onPress,
}: {
  label: string;
  count: number;
  clubTypeId: string;
  imageUrl?: string | null;
  width: number;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  const remote = resolveImageUrl(imageUrl);
  const bundled = getClubTypeImageSource(clubTypeId);
  const vis = getClubTypeVisual(clubTypeId);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width, marginBottom: 10 }, pressed && { opacity: 0.92 }]}
    >
      <View style={[styles.sportImageWrap, { backgroundColor: vis.colorSoft }]}>
        {remote ? (
          <Image source={{ uri: remote }} style={styles.sportImage} contentFit="cover" />
        ) : bundled ? (
          <Image source={bundled} style={styles.sportImage} contentFit="cover" />
        ) : (
          <View style={styles.sportImageFallback}>
            <Ionicons name={vis.icon} size={26} color={vis.color} />
          </View>
        )}
      </View>
      <Text
        style={[styles.sportImageLabel, { color: colors.text }, typo.style("semibold", { textAlign: "center" })]}
        numberOfLines={2}
      >
        {`${label} (${count})`}
      </Text>
    </Pressable>
  );
}

export function DiscoverHero({
  title,
  subtitle,
  children,
  stats,
  photoHero,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  stats?: { label: string; value: string | number }[];
  /** Subtle photo background for the explore home hero */
  photoHero?: boolean;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  const { locale } = useI18n();
  const insets = useSafeAreaInsets();
  const heroStyle = [styles.discoverHero, photoHero && styles.discoverHeroPhoto];

  const content = (
    <View style={styles.discoverHeroInner}>
      <View style={styles.discoverLogoWrap}>
        <NawadyLogo locale={locale} width={photoHero ? 240 : 180} height={photoHero ? 58 : 44} />
      </View>
      <Text
        style={[
          styles.discoverTitle,
          photoHero && styles.discoverTitlePhoto,
          typo.style("bold", photoHero ? { textAlign: "center" } : undefined),
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.discoverSub,
            photoHero && styles.discoverSubPhoto,
            typo.style("regular", photoHero ? { textAlign: "center" } : undefined),
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
      {stats && stats.length > 0 ? (
        <View style={[styles.discoverStats, photoHero && styles.discoverStatsPhoto]}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.discoverStatItem, photoHero && styles.discoverStatItemPhoto]}>
              <Text
                style={[
                  styles.discoverStatValue,
                  photoHero && styles.discoverStatValuePhoto,
                  typo.style("bold", { textAlign: "center" }),
                ]}
              >
                {s.value}
              </Text>
              <Text
                style={[
                  styles.discoverStatLabel,
                  photoHero && styles.discoverStatLabelPhoto,
                  typo.style("regular", { textAlign: "center" }),
                ]}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {children ? <View style={styles.discoverHeroChildren}>{children}</View> : null}
    </View>
  );

  if (photoHero) {
    return (
      <View style={heroStyle}>
        <Image source={EXPLORE_HERO_IMAGE} style={styles.discoverHeroBg} contentFit="cover" />
        <LinearGradient
          colors={["rgba(0, 74, 173, 0.35)", "rgba(0, 38, 84, 0.85)"]}
          style={styles.discoverHeroOverlay}
        />
        <View style={[styles.discoverHeroContent, { paddingTop: insets.top + spacing.sm }]}>
          {content}
        </View>
        <HeroWave color={colors.bg} height={36} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#004aad", "#003580", "#002654"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={heroStyle}
    >
      {content}
    </LinearGradient>
  );
}

export function SportCategoryCard({
  label,
  count,
  color,
  icon,
  onPress,
}: {
  label: string;
  count: number;
  color: string;
  icon: IonName;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sportCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.sportCardIcon, { backgroundColor: withAlpha(color, 0.14) }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text
        style={[styles.sportCardLabel, { color: colors.text }, typo.style("semibold", { textAlign: "center" })]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text style={[styles.sportCardCount, { color: colors.textMuted }, typo.style("regular", { textAlign: "center" })]}>
        {count}
      </Text>
    </Pressable>
  );
}

export function ClassRowCard({
  name,
  clubName,
  time,
  coach,
  spots,
  accent,
  onPress,
}: {
  name: string;
  clubName: string;
  time: string;
  coach?: string | null;
  spots?: string;
  accent: string;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const inner = (
    <View style={styles.classRow}>
      <View style={[styles.classRowBar, { backgroundColor: accent }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.classRowName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.classRowClub, { color: colors.primary }]}>{clubName}</Text>
        <Text style={[styles.classRowMeta, { color: colors.textMuted }]}>
          {time}
          {coach ? ` · ${coach}` : ""}
          {spots ? ` · ${spots}` : ""}
        </Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </View>
  );
  if (!onPress) return <Card style={{ padding: 0, overflow: "hidden" }}>{inner}</Card>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
      <Card style={{ padding: 0, overflow: "hidden" }}>{inner}</Card>
    </Pressable>
  );
}

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  onDark,
  rounded,
  compact,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  onDark?: boolean;
  /** Pill-shaped search field */
  rounded?: boolean;
  /** No bottom margin (for inline toolbars) */
  compact?: boolean;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  return (
    <TextInput
      style={[
        styles.search,
        rounded && styles.searchRounded,
        compact && styles.searchCompact,
        onDark
          ? { backgroundColor: "rgba(255,255,255,0.92)", borderColor: "rgba(255,255,255,0.25)", color: "#0f172a" }
          : { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
        typo.style("regular"),
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="while-editing"
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, gap: spacing.md },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logo: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#fff" },
  logoFallback: { alignItems: "center", justifyContent: "center" },
  logoLetter: { fontSize: 22, fontWeight: "800", color: staticColors.primary },
  headerText: { flex: 1 },
  clubName: { fontSize: 20, fontWeight: "800", color: "#fff" },
  memberName: { fontSize: 15, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  sectionRowCentered: { justifyContent: "center" },
  sectionTitleCentered: { flex: 1, textAlign: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  btn: {
    backgroundColor: staticColors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: staticColors.border },
  btnDanger: { backgroundColor: staticColors.dangerBg, borderWidth: 1, borderColor: "#fecaca" },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.88 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnTextOutline: { color: staticColors.primary },
  btnTextDanger: { color: staticColors.danger },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  skeleton: { backgroundColor: "#e2e8f0", borderRadius: radius.md },
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: staticColors.text },
  emptySub: { fontSize: 14, color: staticColors.textMuted, textAlign: "center", marginTop: 6 },
  search: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  searchRounded: {
    borderRadius: 999,
    paddingVertical: 11,
  },
  searchCompact: {
    marginBottom: 0,
  },
  exploreTopBarHero: {
    minHeight: 140,
    overflow: "hidden",
    position: "relative",
  },
  exploreTopBarBg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  exploreTopBarContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 52,
    zIndex: 1,
  },
  nawadyMark: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#002654",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  nawadyMarkLetter: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 1,
  },
  exploreTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exploreSearchWrap: {
    flex: 1,
    minWidth: 0,
  },
  sportImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  sportImage: {
    width: "100%",
    height: "100%",
  },
  sportImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sportImageLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
    lineHeight: 14,
    minHeight: 28,
    textAlign: "center",
  },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  quickAction: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontWeight: "600", color: staticColors.text, textAlign: "center" },
  premiumEmpty: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 16, gap: 8 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconLabel: { fontSize: 12, color: staticColors.textMuted, fontWeight: "600" },
  iconValue: { fontSize: 15, fontWeight: "700", color: staticColors.text, marginTop: 1 },
  clubCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  favBtn: { padding: 4 },
  clubCardCompact: { marginBottom: 0 },
  clubCardAccent: { height: 4 },
  clubCardBody: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md },
  clubCardLogo: { width: 56, height: 56, borderRadius: 14, backgroundColor: "#fff" },
  clubCardTypeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  clubCardName: { fontSize: 17, fontWeight: "800" },
  clubCardMeta: { fontSize: 13, marginTop: 2, textTransform: "capitalize" },
  clubCardStat: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: "700" },
  browseCard: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 10,
  },
  browseCardList: {
    padding: 12,
    gap: 12,
  },
  browseCardLogoWrap: {
    flexShrink: 0,
    alignSelf: "stretch",
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  browseCardLogo: {},
  browseCardFav: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
  },
  browseCardBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    justifyContent: "center",
  },
  browseCardBodyRtl: {
    alignItems: "flex-end",
  },
  browseCardName: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  browseCardNameFill: {
    alignSelf: "stretch",
  },
  browseCardTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  browseCardTypePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  browseCardTypeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  browseCardLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  browseCardLocRowRtl: {
    flexDirection: "row-reverse",
  },
  browseCardLoc: {
    fontSize: 11,
    flexShrink: 1,
  },
  pkgGridCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  pkgGridHeader: { height: 8 },
  pkgGridBody: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12, gap: 6, alignItems: "center" },
  pkgGridName: { fontSize: 14, fontWeight: "800", textAlign: "center", lineHeight: 18, minHeight: 36, width: "100%" },
  pkgGridMetaPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, maxWidth: "100%" },
  pkgGridMeta: { fontSize: 10, fontWeight: "700" },
  pkgGridPrice: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  pkgGridAction: {
    marginTop: 4,
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    minHeight: 34,
    justifyContent: "center",
  },
  pkgGridActionDisabled: { opacity: 0.7 },
  pkgGridActionText: { fontSize: 11, fontWeight: "700" },
  discoverHero: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
    marginHorizontal: -spacing.md,
    marginBottom: spacing.sm,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: "hidden",
  },
  discoverHeroPhoto: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    minHeight: 248,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginTop: 0,
    marginBottom: spacing.md,
  },
  discoverLogoWrap: { alignItems: "center", marginBottom: spacing.md },
  discoverHeroInner: { width: "100%" },
  discoverHeroTopRtl: { width: "100%" },
  discoverHeroBg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  discoverHeroOverlay: { ...StyleSheet.absoluteFillObject },
  discoverHeroContent: {
    paddingBottom: 28,
    paddingHorizontal: spacing.lg,
    zIndex: 1,
  },
  discoverHeroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  discoverBrand: { fontSize: 12, fontWeight: "800", color: "#93c5fd", letterSpacing: 1.5, textTransform: "uppercase" },
  discoverBrandPhoto: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.75)", letterSpacing: 1.2 },
  discoverTitle: { fontSize: 30, fontWeight: "800", color: "#fff", marginTop: 10, letterSpacing: -0.5, width: "100%" },
  discoverTitlePhoto: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 0,
    letterSpacing: 0,
    color: "rgba(255,255,255,0.95)",
    textAlign: "center",
  },
  discoverSub: { fontSize: 15, color: "#cbd5e1", marginTop: 8, lineHeight: 22, width: "100%" },
  discoverSubPhoto: { fontSize: 13, color: "rgba(255,255,255,0.78)", marginTop: 4, lineHeight: 19, textAlign: "center" },
  discoverStats: { flexDirection: "row", marginTop: 20, gap: 10 },
  discoverStatsPhoto: { marginTop: 12, gap: 8 },
  discoverStatItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  discoverStatItemPhoto: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  discoverStatValue: { fontSize: 20, fontWeight: "800", color: "#fff" },
  discoverStatValuePhoto: { fontSize: 16, fontWeight: "700" },
  discoverStatLabel: { fontSize: 10, fontWeight: "600", color: "#94a3b8", marginTop: 2, textAlign: "center" },
  discoverStatLabelPhoto: { fontSize: 9, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  discoverHeroChildren: { marginTop: 12 },
  sportCard: {
    width: 88,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    marginRight: 10,
  },
  sportCardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sportCardLabel: { fontSize: 11, fontWeight: "700", marginTop: 8, textAlign: "center" },
  sportCardCount: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  classRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md },
  classRowBar: { width: 4, height: 48, borderRadius: 4 },
  classRowName: { fontSize: 16, fontWeight: "700" },
  classRowClub: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  classRowMeta: { fontSize: 12, marginTop: 4 },
});
