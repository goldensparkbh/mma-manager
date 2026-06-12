import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import type { ComponentProps } from "react";
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
import { NAWADY_BRAND } from "./brand";
import { useTypography } from "./fonts";
import { useI18n } from "./i18n";
import { openWebDashboard } from "./plan";
import { radius, spacing, useThemeColors, withAlpha } from "./theme";

export function Screen({
  children,
  scroll,
  refreshing,
  onRefresh,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: spacing.md, paddingBottom: insets.bottom + 88, paddingHorizontal: spacing.md };

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={pad}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, pad]}>{children}</View>;
}

export function StaffHeader({ title, subtitle, tenantName }: { title: string; subtitle?: string; tenantName?: string }) {
  const typo = useTypography();

  return (
    <LinearGradient
      colors={[NAWADY_BRAND.primary, NAWADY_BRAND.primaryDark, NAWADY_BRAND.primaryDarker]}
      style={styles.header}
    >
      {tenantName ? <Text style={[styles.tenant, typo.style("semibold")]}>{tenantName}</Text> : null}
      <Text style={[styles.title, typo.style("bold")]}>{title}</Text>
      {subtitle ? <Text style={[styles.sub, typo.style("regular")]}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  const colors = useThemeColors();
  const typo = useTypography();
  return (
    <Card style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.text }, typo.style("bold")]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }, typo.style("semibold")]}>{label}</Text>
    </Card>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "danger";
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  const outline = variant === "outline";
  const danger = variant === "danger";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: colors.primary },
        outline && { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border },
        danger && { backgroundColor: colors.dangerBg },
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : "#fff"} />
      ) : (
        <Text
          style={[
            styles.btnText,
            typo.style("bold"),
            outline && { color: colors.primary },
            danger && { color: colors.danger },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function SearchInput({
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

  return (
    <TextInput
      style={[
        styles.search,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          color: colors.text,
        },
        typo.style("regular"),
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      autoCapitalize="none"
      clearButtonMode="while-editing"
      textAlign={typo.isRtl ? "right" : "left"}
    />
  );
}

export function EmptyState({ title, illustration }: { title: string; illustration?: React.ReactNode }) {
  const colors = useThemeColors();
  const typo = useTypography();
  return (
    <View style={styles.empty}>
      {illustration}
      <Text style={[styles.emptyText, { color: colors.textMuted }, typo.style("regular")]}>{title}</Text>
    </View>
  );
}

export function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const typo = useTypography();

  return (
    <Pressable onPress={onPress} style={styles.quick}>
      <View style={[styles.quickIcon, { backgroundColor: withAlpha(colors.primary, 0.15) }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={[styles.quickLabel, { color: colors.text }, typo.style("semibold")]}>{label}</Text>
    </Pressable>
  );
}

export function UpgradeBanner({ compact }: { compact?: boolean }) {
  const colors = useThemeColors();
  const typo = useTypography();
  const { t } = useI18n();

  return (
    <Pressable
      onPress={() => openWebDashboard("/billing")}
      style={[
        styles.upgrade,
        {
          backgroundColor: withAlpha(colors.primary, 0.12),
          borderColor: withAlpha(colors.primary, 0.35),
        },
        compact && styles.upgradeCompact,
        typo.row,
      ]}
    >
      <Ionicons name="sparkles" size={compact ? 18 : 22} color={colors.warning} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.upgradeTitle, { color: colors.text }, typo.style("bold")]}>
          {compact ? t("upgrade.titleCompact") : t("upgrade.title")}
        </Text>
        {!compact ? (
          <Text style={[styles.upgradeSub, { color: colors.textMuted }, typo.style("regular")]}>
            {t("upgrade.subtitle")}
          </Text>
        ) : null}
      </View>
      <Ionicons name="open-outline" size={18} color={colors.primary} />
    </Pressable>
  );
}

export function MenuRow({
  icon,
  label,
  subtitle,
  onPress,
  badge,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string;
}) {
  const colors = useThemeColors();
  const typo = useTypography();

  return (
    <Pressable onPress={onPress} style={[styles.menuRow, { borderBottomColor: colors.border }, typo.row]}>
      <View style={[styles.menuIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: colors.text }, typo.style("semibold")]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.menuSub, { color: colors.textMuted }, typo.style("regular")]}>{subtitle}</Text>
        ) : null}
      </View>
      {badge ? (
        <Text style={[styles.menuBadge, { color: colors.primary, backgroundColor: withAlpha(colors.primary, 0.15) }, typo.style("bold")]}>
          {badge}
        </Text>
      ) : null}
      <Ionicons name={typo.isRtl ? "chevron-back" : "chevron-forward"} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  tenant: { fontSize: 12, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 4 },
  sub: { fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  stat: { flex: 1, alignItems: "center", minWidth: "45%" },
  statValue: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 4, fontWeight: "600", textAlign: "center" },
  btn: { borderRadius: radius.md, paddingVertical: 13, alignItems: "center", minHeight: 48, justifyContent: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  search: { borderWidth: 1, borderRadius: radius.md, padding: 12, fontSize: 16, marginBottom: spacing.sm },
  empty: { paddingVertical: 32, alignItems: "center" },
  emptyText: { fontSize: 15, marginTop: 8, textAlign: "center" },
  quick: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  upgrade: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, marginBottom: spacing.sm },
  upgradeCompact: { paddingVertical: 10 },
  upgradeTitle: { fontSize: 14, fontWeight: "700" },
  upgradeSub: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 16, fontWeight: "600" },
  menuSub: { fontSize: 12, marginTop: 2 },
  menuBadge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
});
