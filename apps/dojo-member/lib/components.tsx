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
import { colors, radius, spacing, withAlpha } from "./theme";

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
  const padding = { paddingTop: spacing.md, paddingBottom: padBottom ? insets.bottom + 80 : spacing.md };

  if (scroll) {
    return (
      <ScrollView
        style={[styles.screen, style]}
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
  return <View style={[styles.screen, padding, style]}>{children}</View>;
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
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
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
  const bg =
    tone === "success" ? "#dcfce7" : tone === "warning" ? "#fef3c7" : tone === "danger" ? colors.dangerBg : "#f1f5f9";
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

export function SearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <TextInput
      style={styles.search}
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
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: spacing.md, gap: spacing.md },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logo: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#fff" },
  logoFallback: { alignItems: "center", justifyContent: "center" },
  logoLetter: { fontSize: 22, fontWeight: "800", color: colors.primary },
  headerText: { flex: 1 },
  clubName: { fontSize: 20, fontWeight: "800", color: "#fff" },
  memberName: { fontSize: 15, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border },
  btnDanger: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: "#fecaca" },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.88 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnTextOutline: { color: colors.primary },
  btnTextDanger: { color: colors.danger },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  skeleton: { backgroundColor: "#e2e8f0", borderRadius: radius.md },
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 6 },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  quickAction: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontWeight: "600", color: colors.text, textAlign: "center" },
  premiumEmpty: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 16, gap: 8 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  iconValue: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 1 },
});
