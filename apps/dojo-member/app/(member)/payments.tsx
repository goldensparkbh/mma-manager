import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Badge, Card, PremiumEmptyState, PrimaryButton, Skeleton } from "@/lib/components";
import { PaymentsIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import { useBranding } from "@/lib/branding";
import { useCheckout, usePackages, usePayments } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import { bookingStatusLabel, bookingStatusTone, formatCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { spacing, useThemeColors } from "@/lib/theme";
import type { MemberPayment, Package } from "@/lib/types";

const PAYMENT_RETURN = Linking.createURL("payment-result");

export default function PaymentsScreen() {
  const { show } = useToast();
  const { refresh } = useAuth();
  const { accent } = useBranding();
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const { data: packagesData, isLoading: loadingPackages, refetch: refetchPackages, isRefetching } = usePackages();
  const { data: paymentsData, isLoading: loadingPayments, refetch: refetchPayments } = usePayments();
  const packages: Package[] = packagesData ?? [];
  const payments: MemberPayment[] = paymentsData ?? [];
  const checkout = useCheckout();

  const refreshAll = useCallback(() => {
    refetchPackages();
    refetchPayments();
    refresh();
  }, [refetchPackages, refetchPayments, refresh]);

  const onBuy = async (pkg: Package) => {
    try {
      const result = await checkout.mutateAsync({
        packageId: pkg.id,
        redirectUrl: PAYMENT_RETURN,
      });
      if (result.url) {
        const browser = await WebBrowser.openAuthSessionAsync(result.url, PAYMENT_RETURN);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (browser.type === "success" && browser.url) {
          const parsed = Linking.parse(browser.url);
          const tapId = parsed.queryParams?.tap_id;
          if (tapId) {
            refreshAll();
            show(t("member.paymentComplete"), "success");
          }
        }
      }
    } catch (e) {
      show((e as Error).message, "error");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + spacing.sm }]}>
      <FlatList
        data={packages}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refreshAll}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={[styles.heading, { color: colors.text }]}>{t("member.availablePackages")}</Text>
            {loadingPackages ? <Skeleton height={100} /> : null}
          </>
        }
        ListEmptyComponent={
          !loadingPackages ? (
            <PremiumEmptyState
              title={t("member.noPackages")}
              subtitle={t("member.noPackagesSub")}
              illustration={<PaymentsIllustration size={150} />}
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <FadeInView delay={index * 45}>
          <Card style={styles.card}>
            <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {item.packageType === "sessions"
                ? t("member.sessionsPkg", { count: item.sessionCount ?? 0 })
                : t("member.daysValidity", { days: item.duration })}
            </Text>
            <View style={styles.row}>
              <View>
                <Text style={[styles.price, { color: colors.text }]}>
                  {formatCurrency(item.totalAmount ?? item.price, "BHD", locale)}
                </Text>
                {item.platformFee ? (
                  <Text style={[styles.feeNote, { color: colors.textMuted }]}>
                    {t("member.platformFeeNote", { fee: formatCurrency(item.platformFee, "BHD", locale) })}
                  </Text>
                ) : null}
              </View>
              <PrimaryButton
                label={t("member.payNow")}
                loading={checkout.isPending}
                onPress={() => onBuy(item)}
              />
            </View>
          </Card>
          </FadeInView>
        )}
        ListFooterComponent={
          <View style={styles.history}>
            <Text style={[styles.heading, { color: colors.text }]}>{t("member.paymentHistory")}</Text>
            {loadingPayments ? (
              <Skeleton height={80} />
            ) : payments.length === 0 ? (
              <PremiumEmptyState title={t("member.noPayments")} illustration={<PaymentsIllustration size={120} />} />
            ) : (
              payments.slice(0, 15).map((p) => (
                <Card key={p.id} style={styles.historyRow}>
                  <View>
                    <Text style={[styles.name, { color: colors.text }]}>{p.packageName || "Payment"}</Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {p.createdAt ? format(new Date(p.createdAt), "d MMM yyyy · HH:mm") : ""}
                    </Text>
                  </View>
                  <View style={styles.historyEnd}>
                    <Text style={[styles.price, { color: colors.text }]}>{formatCurrency(p.amount, p.currency || "BHD", locale)}</Text>
                    <Badge label={bookingStatusLabel(p.status, locale)} tone={bookingStatusTone(p.status)} />
                  </View>
                </Card>
              ))
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: 100 },
  heading: { fontSize: 17, fontWeight: "700", marginBottom: spacing.sm, marginTop: spacing.sm },
  card: { gap: 6, marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 12 },
  price: { fontSize: 17, fontWeight: "800" },
  feeNote: { fontSize: 11, marginTop: 2 },
  history: { marginTop: spacing.lg },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  historyEnd: { alignItems: "flex-end", gap: 6 },
});
