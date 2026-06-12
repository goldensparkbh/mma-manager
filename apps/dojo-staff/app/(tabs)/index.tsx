import { format } from "date-fns";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, PrimaryButton, QuickAction, Screen, StaffHeader, StatCard, UpgradeBanner } from "@/lib/components";
import { useTypography } from "@/lib/fonts";
import { useAttendance, useTodaySessions } from "@/lib/hooks";
import { DashboardIllustration } from "@/lib/illustrations";
import { useI18n } from "@/lib/i18n";
import { FadeInView } from "@/lib/motion";
import type { AttendanceRecord, ClassSession } from "@/lib/types";
import { spacing, useThemeColors } from "@/lib/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const { tenant, user, isFreePlan } = useAuth();
  const { t, dateLocale } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
  const { data: sessionsData, isLoading: loadingSessions, refetch, isRefetching } = useTodaySessions();
  const { data: attendanceData, isLoading: loadingAtt } = useAttendance();
  const sessions: ClassSession[] = sessionsData ?? [];
  const attendance: AttendanceRecord[] = attendanceData ?? [];

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => refetch()}>
      <StaffHeader
        title={t("dashboard.title")}
        subtitle={format(new Date(), "EEEE, d MMMM", { locale: dateLocale })}
        tenantName={tenant?.name}
      />
      {isFreePlan ? <UpgradeBanner compact /> : null}

      <FadeInView delay={0}>
        <View style={[styles.quickRow, typo.row]}>
          <QuickAction icon="qr-code" label={t("dashboard.scan")} onPress={() => router.push("/(tabs)/scan")} />
          <QuickAction icon="people" label={t("dashboard.members")} onPress={() => router.push("/(tabs)/members")} />
          <QuickAction icon="calendar" label={t("dashboard.schedule")} onPress={() => router.push("/(tabs)/schedule")} />
        </View>
      </FadeInView>

      <FadeInView delay={50}>
        <View style={[styles.stats, typo.row]}>
          <StatCard label={t("dashboard.checkInsToday")} value={loadingAtt ? "…" : attendance.length} />
          <StatCard label={t("dashboard.classesToday")} value={loadingSessions ? "…" : sessions.length} />
        </View>
      </FadeInView>

      <FadeInView delay={100}>
        <PrimaryButton label={t("dashboard.openScanner")} onPress={() => router.push("/(tabs)/scan")} />
      </FadeInView>

      <FadeInView delay={140}>
        <Text style={[styles.section, { color: colors.text }, typo.style("bold")]}>{t("dashboard.recentCheckIns")}</Text>
        {loadingAtt ? (
          <Text style={[styles.muted, { color: colors.textMuted }, typo.style("regular")]}>{t("common.loading")}</Text>
        ) : attendance.length === 0 ? (
          <EmptyState title={t("dashboard.noCheckIns")} illustration={<DashboardIllustration size={150} />} />
        ) : (
          attendance.slice(0, 8).map((a, i) => (
            <FadeInView key={a.id} delay={i * 30}>
              <Card>
                <Text style={[styles.name, { color: colors.text }, typo.style("bold")]}>{a.memberName}</Text>
                <Text style={[styles.muted, { color: colors.textMuted }, typo.style("regular")]}>
                  {a.checkIn ? format(new Date(a.checkIn), "HH:mm") : "—"}
                </Text>
              </Card>
            </FadeInView>
          ))
        )}
      </FadeInView>

      <FadeInView delay={180}>
        <Text style={[styles.section, { color: colors.text }, typo.style("bold")]}>{t("dashboard.todaysClasses")}</Text>
        {sessions.length === 0 ? (
          <EmptyState title={t("dashboard.noClasses")} illustration={<DashboardIllustration size={130} />} />
        ) : (
          sessions.map((s, i) => (
            <FadeInView key={s.id} delay={i * 35}>
              <Card>
                <Text style={[styles.name, { color: colors.text }, typo.style("bold")]}>{s.name}</Text>
                <Text style={[styles.muted, { color: colors.textMuted }, typo.style("regular")]}>
                  {format(new Date(s.startsAt), "HH:mm")} · {s.bookedCount ?? 0}/{s.capacity}
                </Text>
              </Card>
            </FadeInView>
          ))
        )}
      </FadeInView>

      {user?.role === "coach" ? (
        <Text style={[styles.coachNote, { color: colors.textMuted }, typo.style("regular")]}>{t("dashboard.coachNote")}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: spacing.md },
  stats: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  section: { fontSize: 17, fontWeight: "700", marginTop: spacing.md, marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: "700" },
  muted: { fontSize: 13, marginTop: 2 },
  coachNote: { fontSize: 12, marginTop: spacing.md, textAlign: "center" },
});
