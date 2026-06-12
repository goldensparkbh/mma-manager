import { format, isToday, isTomorrow } from "date-fns";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, PrimaryButton, StaffHeader } from "@/lib/components";
import { useTypography } from "@/lib/fonts";
import { useSessions } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { openWebDashboard } from "@/lib/plan";
import type { ClassSession } from "@/lib/types";
import { spacing, useThemeColors } from "@/lib/theme";

export default function ScheduleScreen() {
  const { tenant, user } = useAuth();
  const { t, dateLocale } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
  const { data: sessionsData, isLoading, refetch, isRefetching } = useSessions();
  const sessions: ClassSession[] = sessionsData ?? [];

  const dayLabel = (d: Date) => {
    if (isToday(d)) return t("common.today");
    if (isTomorrow(d)) return t("common.tomorrow");
    return format(d, "EEE d MMM", { locale: dateLocale });
  };

  const upcoming = sessions
    .filter((s: ClassSession) => (!s.status || s.status === "scheduled") && new Date(s.startsAt) >= new Date())
    .sort((a: ClassSession, b: ClassSession) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StaffHeader title={t("schedule.title")} subtitle={t("schedule.subtitle")} tenantName={tenant?.name} />
      <View style={[styles.webBanner, { backgroundColor: colors.webBannerBg, borderColor: colors.webBannerBorder }]}>
        <Text style={[styles.webBannerText, { color: colors.webBannerText }, typo.style("regular")]}>{t("schedule.webBanner")}</Text>
        <PrimaryButton label={t("schedule.openWeb")} onPress={() => openWebDashboard("/schedule")} />
      </View>
      <FlatList
        data={upcoming}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <Text style={[styles.muted, { color: colors.textMuted }, typo.style("regular")]}>{t("common.loading")}</Text>
          ) : (
            <EmptyState title={t("schedule.noClasses")} />
          )
        }
        renderItem={({ item, index }) => {
          const showDay =
            index === 0 ||
            format(new Date(item.startsAt), "yyyy-MM-dd") !== format(new Date(upcoming[index - 1].startsAt), "yyyy-MM-dd");
          return (
            <>
              {showDay ? (
                <Text style={[styles.day, { color: colors.primary }, typo.style("bold")]}>{dayLabel(new Date(item.startsAt))}</Text>
              ) : null}
              <Pressable onPress={() => openWebDashboard("/schedule")}>
                <Card>
                  <Text style={[styles.name, { color: colors.text }, typo.style("bold")]}>{item.name}</Text>
                  <Text style={[styles.muted, { color: colors.textMuted }, typo.style("regular")]}>
                    {format(new Date(item.startsAt), "HH:mm")}
                  </Text>
                  {item.coachName ? (
                    <Text style={[styles.muted, { color: colors.textMuted }, typo.style("regular")]}>
                      {t("schedule.coach", { name: item.coachName })}
                    </Text>
                  ) : null}
                  {item.location ? (
                    <Text style={[styles.muted, { color: colors.textMuted }, typo.style("regular")]}>{item.location}</Text>
                  ) : null}
                  <Text style={[styles.spots, { color: colors.text }, typo.style("semibold")]}>
                    {t("schedule.booked", { booked: item.bookedCount ?? 0, capacity: item.capacity })}
                  </Text>
                  <Text style={[styles.editHint, { color: colors.primary }, typo.style("semibold")]}>{t("schedule.manageWeb")}</Text>
                </Card>
              </Pressable>
            </>
          );
        }}
      />
      {user?.role === "coach" ? (
        <Text style={[styles.note, { color: colors.textMuted }, typo.style("regular")]}>{t("dashboard.coachNote")}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.md },
  webBanner: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, gap: 10, borderWidth: 1 },
  webBannerText: { fontSize: 13, lineHeight: 18 },
  list: { paddingBottom: 100 },
  day: { fontSize: 15, fontWeight: "700", marginTop: spacing.md, marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: "700" },
  muted: { fontSize: 13, marginTop: 2 },
  spots: { fontSize: 13, fontWeight: "600", marginTop: 8 },
  editHint: { fontSize: 11, marginTop: 6, fontWeight: "600" },
  note: { textAlign: "center", fontSize: 12, padding: spacing.md },
});
