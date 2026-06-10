import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "./components";
import { useI18n } from "./i18n";
import { spacing, useThemeColors } from "./theme";

export function QueryErrorState({
  message,
  onRetry,
  compact,
}: {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <View style={[styles.wrap, compact && styles.compact, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="cloud-offline-outline" size={compact ? 28 : 40} color={colors.textMuted} />
      <Text style={[styles.title, { color: colors.text }]}>{t("error.title")}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>{message || t("error.offline")}</Text>
      {onRetry ? <PrimaryButton label={t("error.retry")} onPress={onRetry} icon="refresh" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: spacing.sm,
  },
  compact: { padding: spacing.md },
  title: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  sub: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 4 },
});
