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
import { colors, radius, spacing } from "./theme";
import { openWebDashboard } from "./plan";

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
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: spacing.md, paddingBottom: insets.bottom + 88, paddingHorizontal: spacing.md };
  if (scroll) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={pad}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.screen, pad]}>{children}</View>;
}

export function StaffHeader({ title, subtitle, tenantName }: { title: string; subtitle?: string; tenantName?: string }) {
  return (
    <LinearGradient colors={["#1e293b", "#0f172a"]} style={styles.header}>
      {tenantName ? <Text style={styles.tenant}>{tenantName}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  const outline = variant === "outline";
  const danger = variant === "danger";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, outline && styles.btnOutline, danger && styles.btnDanger, (disabled || loading) && { opacity: 0.5 }]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : "#fff"} />
      ) : (
        <Text style={[styles.btnText, outline && { color: colors.primary }, danger && { color: "#fecaca" }]}>{label}</Text>
      )}
    </Pressable>
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
      clearButtonMode="while-editing"
    />
  );
}

export function EmptyState({ title, illustration }: { title: string; illustration?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      {illustration}
      <Text style={styles.emptyText}>{title}</Text>
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
  return (
    <Pressable onPress={onPress} style={styles.quick}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

export function UpgradeBanner({ compact }: { compact?: boolean }) {
  return (
    <Pressable onPress={() => openWebDashboard("/billing")} style={[styles.upgrade, compact && styles.upgradeCompact]}>
      <Ionicons name="sparkles" size={compact ? 18 : 22} color="#fbbf24" />
      <View style={{ flex: 1 }}>
        <Text style={styles.upgradeTitle}>{compact ? "Unlock full web dashboard" : "Run your whole club on the web"}</Text>
        {!compact ? (
          <Text style={styles.upgradeSub}>Finance, store, analytics & more — upgrade anytime on Nawady web.</Text>
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
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
      </View>
      {badge ? <Text style={styles.menuBadge}>{badge}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg, marginHorizontal: -spacing.md, marginTop: -spacing.md, marginBottom: spacing.md, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  tenant: { fontSize: 12, color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 4 },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  stat: { flex: 1, alignItems: "center", minWidth: "45%" },
  statValue: { fontSize: 28, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: "600" },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: "center", minHeight: 48, justifyContent: "center" },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border },
  btnDanger: { backgroundColor: colors.dangerBg },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  search: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, color: colors.text, fontSize: 16, marginBottom: spacing.sm },
  empty: { paddingVertical: 32, alignItems: "center" },
  emptyText: { color: colors.textMuted, fontSize: 15, marginTop: 8 },
  quick: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(59,130,246,0.15)", alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontWeight: "600", color: colors.text },
  upgrade: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(59,130,246,0.12)", borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: "rgba(59,130,246,0.35)", marginBottom: spacing.sm },
  upgradeCompact: { paddingVertical: 10 },
  upgradeTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  upgradeSub: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(59,130,246,0.12)", alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  menuSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  menuBadge: { fontSize: 11, fontWeight: "700", color: colors.primary, backgroundColor: "rgba(59,130,246,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
});
