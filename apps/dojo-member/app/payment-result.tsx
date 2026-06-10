import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, Screen } from "@/lib/components";
import { useConfirmPayment } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { spacing, useThemeColors } from "@/lib/theme";

export default function PaymentResultScreen() {
  const { tap_id: tapId } = useLocalSearchParams<{ tap_id?: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const colors = useThemeColors();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useConfirmPayment(tapId || null);
  const success = data?.ok === true;

  useEffect(() => {
    if (success) {
      qc.invalidateQueries({ queryKey: ["portal", "payments"] });
      const timer = setTimeout(() => router.replace("/(member)/payments"), 3500);
      return () => clearTimeout(timer);
    }
  }, [success, router, qc]);

  if (!tapId) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>{t("payment.missingId")}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : success ? (
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        ) : (
          <Ionicons name="close-circle" size={64} color={colors.danger} />
        )}
        <Text style={[styles.title, { color: colors.text }]}>
          {isLoading ? t("payment.verifying") : success ? t("payment.success") : t("payment.failed")}
        </Text>
        {!isLoading && isError ? (
          <Text style={{ color: colors.textMuted, textAlign: "center" }}>{t("error.offline")}</Text>
        ) : null}
        <PrimaryButton label={t("payment.back")} onPress={() => router.replace("/(member)/payments")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: {
    marginTop: 80,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
});
