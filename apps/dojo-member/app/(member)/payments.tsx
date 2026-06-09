import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Badge, Card, ClubHeader, PremiumEmptyState, PrimaryButton, Skeleton } from "@/lib/components";
import { PaymentsIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import { useBranding } from "@/lib/branding";
import { useCheckout, usePackages, usePayments } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import { colors, spacing } from "@/lib/theme";
import type { MemberPayment, Package } from "@/lib/types";

export default function PaymentsScreen() {
  const { show } = useToast();
  const { clubName, portalInfo, refresh } = useAuth();
  const { accent } = useBranding();

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
      const result = await checkout.mutateAsync(pkg.id);
      if (result.url) {
        await WebBrowser.openBrowserAsync(result.url);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        show("Complete payment in browser, then pull to refresh", "info");
      }
    } catch (e) {
      show((e as Error).message, "error");
    }
  };

  return (
    <View style={styles.root}>
      <ClubHeader clubName={clubName} logoUrl={portalInfo?.logoUrl} accent={accent} subtitle="Renew & pay" />
      <FlatList
        data={packages}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refreshAll}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.heading}>Available packages</Text>
            {loadingPackages ? <Skeleton height={100} /> : null}
          </>
        }
        ListEmptyComponent={
          !loadingPackages ? (
            <PremiumEmptyState
              title="No packages available"
              subtitle="Contact your club for membership options"
              illustration={<PaymentsIllustration size={150} />}
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <FadeInView delay={index * 45}>
          <Card style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.packageType === "sessions"
                ? `${item.sessionCount} sessions`
                : `${item.duration} days validity`}
            </Text>
            <View style={styles.row}>
              <Text style={styles.price}>{item.price} BHD</Text>
              <PrimaryButton
                label="Pay now"
                loading={checkout.isPending}
                onPress={() => onBuy(item)}
              />
            </View>
          </Card>
          </FadeInView>
        )}
        ListFooterComponent={
          <View style={styles.history}>
            <Text style={styles.heading}>Payment history</Text>
            {loadingPayments ? (
              <Skeleton height={80} />
            ) : payments.length === 0 ? (
              <PremiumEmptyState title="No payments yet" illustration={<PaymentsIllustration size={120} />} />
            ) : (
              payments.slice(0, 15).map((p) => (
                <Card key={p.id} style={styles.historyRow}>
                  <View>
                    <Text style={styles.name}>{p.packageName || "Payment"}</Text>
                    <Text style={styles.meta}>
                      {p.createdAt ? format(new Date(p.createdAt), "d MMM yyyy · HH:mm") : ""}
                    </Text>
                  </View>
                  <View style={styles.historyEnd}>
                    <Text style={styles.price}>{p.amount} {p.currency || "BHD"}</Text>
                    <Badge
                      label={p.status}
                      tone={p.status === "captured" || p.status === "paid" ? "success" : "warning"}
                    />
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
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, paddingBottom: 100 },
  heading: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  card: { gap: 6, marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 12 },
  price: { fontSize: 17, fontWeight: "800", color: colors.text },
  history: { marginTop: spacing.lg },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  historyEnd: { alignItems: "flex-end", gap: 6 },
});
