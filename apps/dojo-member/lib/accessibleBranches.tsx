import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, SectionTitle, Skeleton } from "./components";
import { useI18n } from "./i18n";
import { useTypography } from "./fonts";
import { spacing, useThemeColors } from "./theme";
import type { BranchAccessInfo } from "./types";

const COUNTRY_LABELS: Record<string, { en: string; ar: string }> = {
  BH: { en: "Bahrain", ar: "البحرين" },
  SA: { en: "Saudi Arabia", ar: "السعودية" },
  QA: { en: "Qatar", ar: "قطر" },
  OM: { en: "Oman", ar: "عُمان" },
  KW: { en: "Kuwait", ar: "الكويت" },
};

function countryLabel(code: string | null | undefined, locale: "en" | "ar") {
  if (!code) return null;
  const row = COUNTRY_LABELS[code.toUpperCase()];
  return row ? row[locale] : code;
}

type Props = {
  access?: BranchAccessInfo | null;
  loading?: boolean;
};

export function AccessibleBranchesSection({ access, loading }: Props) {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const typo = useTypography();

  if (loading) {
    return (
      <View style={styles.wrap}>
        <SectionTitle title={t("club.accessibleBranches")} />
        <Skeleton height={72} />
      </View>
    );
  }

  const branches = access?.accessibleBranches ?? [];
  if (!branches.length) return null;

  const scopeHint =
    access?.scope === "all_branches"
      ? t("club.branchAccessAll")
      : access?.scope === "same_country"
        ? t("club.branchAccessCountry")
        : t("club.branchAccessHome");

  return (
    <View style={styles.wrap}>
      <SectionTitle title={t("club.accessibleBranches")} />
      <Text style={[styles.hint, { color: colors.textMuted }, typo.style("regular")]}>{scopeHint}</Text>
      {branches.map((b) => {
        const isHome = access?.homeBranch?.id === b.id;
        const country = countryLabel(b.country, locale);
        return (
          <Card key={b.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.meta}>
                <Text style={[styles.name, { color: colors.text }, typo.style("semibold")]}>{b.name}</Text>
                {country ? (
                  <Text style={[styles.sub, { color: colors.textMuted }, typo.style("regular")]}>{country}</Text>
                ) : null}
                {b.address ? (
                  <Text style={[styles.sub, { color: colors.textMuted }, typo.style("regular")]} numberOfLines={2}>
                    {b.address}
                  </Text>
                ) : null}
              </View>
              {isHome ? <Badge label={t("club.homeBranch")} tone="success" /> : null}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  hint: { fontSize: 13, marginBottom: spacing.sm, lineHeight: 18 },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  meta: { flex: 1, minWidth: 0 },
  name: { fontSize: 15 },
  sub: { fontSize: 13, marginTop: 2, lineHeight: 18 },
});
