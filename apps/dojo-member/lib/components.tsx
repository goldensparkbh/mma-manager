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
import { useI18n } from "./i18n";
import { colors as staticColors, radius, spacing, useThemeColors, withAlpha } from "./theme";

type IonName = ComponentProps<typeof Ionicons>["name"];

export function Screen({
  children,
  style,
  scroll,
  refreshing,
  onRefresh,
  padBottom = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padBottom?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const padding = { paddingTop: spacing.md, paddingBottom: padBottom ? insets.bottom + 80 : spacing.md };

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
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="contain" />
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
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
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
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.clubCardLogo} contentFit="contain" />
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

export function DiscoverHero({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t } = useI18n();
  return (
    <LinearGradient colors={["#0f172a", "#1e3a5f"]} style={styles.discoverHero}>
      <Text style={styles.discoverBrand}>{t("platform.brand")}</Text>
      <Text style={styles.discoverTitle}>{title}</Text>
      {subtitle ? <Text style={styles.discoverSub}>{subtitle}</Text> : null}
    </LinearGradient>
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

export function SearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const colors = useThemeColors();
  return (
    <TextInput
      style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
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
  discoverHero: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: spacing.lg },
  discoverBrand: { fontSize: 13, fontWeight: "800", color: "#60a5fa", letterSpacing: 2, textTransform: "uppercase" },
  discoverTitle: { fontSize: 28, fontWeight: "800", color: "#fff", marginTop: 6 },
  discoverSub: { fontSize: 15, color: "#94a3b8", marginTop: 8, lineHeight: 22 },
  classRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md },
  classRowBar: { width: 4, height: 48, borderRadius: 4 },
  classRowName: { fontSize: 16, fontWeight: "700" },
  classRowClub: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  classRowMeta: { fontSize: 12, marginTop: 4 },
});
