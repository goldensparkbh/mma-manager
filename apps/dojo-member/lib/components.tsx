import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
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
        {resolveImageUrl(logoUrl) ? (
          <Image source={{ uri: resolveImageUrl(logoUrl)! }} style={styles.logo} contentFit="contain" />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoLetter}>{clubName.charAt(0)}</Text>
          </View>
        )}
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

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  const colors = useThemeColors();
  const typo = useTypography();
  return (
    <View style={[styles.sectionRow, typo.isRtl && styles.sectionRowRtl]}>
      <Text style={[styles.sectionTitle, { color: colors.text }, typo.style("bold")]}>{title}</Text>
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
  clubType,
  location,
  logoUrl,
  accent,
  typeIcon,
  typeColor,
  typeColorSoft,
  upcomingCount,
  onPress,
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
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  const resolvedLogo = resolveImageUrl(logoUrl);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.94, transform: [{ scale: 0.98 }] },
      ]}
    >
      <LinearGradient
        colors={[accent, withAlpha(accent, 0.65)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gridCardHeader}
      />
      {onToggleFavorite ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavorite();
          }}
          hitSlop={8}
          style={styles.gridCardFav}
        >
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? "#ef4444" : "#fff"} />
        </Pressable>
      ) : null}
      <View style={styles.gridCardLogoWrap}>
        {resolvedLogo ? (
          <Image source={{ uri: resolvedLogo }} style={styles.gridCardLogo} contentFit="contain" />
        ) : (
          <View style={[styles.gridCardLogoFallback, { backgroundColor: typeColorSoft }]}>
            <Ionicons name={typeIcon} size={28} color={typeColor} />
          </View>
        )}
      </View>
      <View style={styles.gridCardBody}>
        <Text
          style={[styles.gridCardName, { color: colors.text }, typo.style("bold", { textAlign: "center" })]}
          numberOfLines={2}
        >
          {name}
        </Text>
        <View style={[styles.gridCardTypePill, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <Text
            style={[styles.gridCardTypeText, { color: accent }, typo.style("semibold", { textAlign: "center" })]}
            numberOfLines={1}
          >
            {clubType.replace(/_/g, " ")}
          </Text>
        </View>
        {location ? (
          <View style={styles.gridCardLocRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.gridCardLoc, { color: colors.textMuted }]} numberOfLines={1}>
              {location.split(",")[0]}
            </Text>
          </View>
        ) : null}
        <View style={styles.gridCardFooter}>
          <Text style={[styles.gridCardStat, { color: colors.textMuted }]}>
            {upcomingCount != null && upcomingCount > 0
              ? `${upcomingCount} class${upcomingCount === 1 ? "" : "es"}`
              : "View club"}
          </Text>
          <Ionicons name="arrow-forward-circle" size={20} color={accent} />
        </View>
      </View>
    </Pressable>
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
        {resolveImageUrl(logoUrl) ? (
          <Image source={{ uri: resolveImageUrl(logoUrl)! }} style={styles.clubCardLogo} contentFit="contain" />
        ) : (
          <View style={[styles.clubCardTypeIcon, { backgroundColor: typeColorSoft }]}>
            <Ionicons name={typeIcon} size={compact ? 20 : 24} color={typeColor} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.clubCardName, { color: colors.text }, compact && { fontSize: 15 }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.clubCardMeta, { color: colors.textMuted }]} numberOfLines={1}>
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
    <View style={[styles.discoverHeroInner, typo.isRtl && styles.discoverHeroInnerRtl]}>
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
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  onDark?: boolean;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  return (
    <TextInput
      style={[
        styles.search,
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
  sectionRowRtl: { flexDirection: "row-reverse" },
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
  clubCardLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#fff" },
  clubCardTypeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  clubCardName: { fontSize: 17, fontWeight: "800" },
  clubCardMeta: { fontSize: 13, marginTop: 2, textTransform: "capitalize" },
  clubCardStat: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: "700" },
  gridCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  gridCardHeader: { height: 56 },
  gridCardFav: { position: "absolute", top: 8, right: 8, zIndex: 2, padding: 4 },
  gridCardLogoWrap: { alignItems: "center", marginTop: -28 },
  gridCardLogo: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#fff",
  },
  gridCardLogoFallback: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  gridCardBody: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, gap: 6 },
  gridCardName: { fontSize: 15, fontWeight: "800", textAlign: "center", lineHeight: 20, minHeight: 40 },
  gridCardTypePill: { alignSelf: "center", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  gridCardTypeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  gridCardLocRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 },
  gridCardLoc: { fontSize: 11, flexShrink: 1 },
  gridCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  gridCardStat: { fontSize: 11, fontWeight: "600" },
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
  discoverHeroInnerRtl: { width: "100%" },
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
