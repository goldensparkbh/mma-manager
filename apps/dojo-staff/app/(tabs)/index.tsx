import { format } from "date-fns";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, PrimaryButton, QuickAction, Screen, StaffHeader, StatCard } from "@/lib/components";
import { useAttendance, useTodaySessions } from "@/lib/hooks";
import { DashboardIllustration } from "@/lib/illustrations";
import { FadeInView } from "@/lib/motion";
import type { AttendanceRecord, ClassSession } from "@/lib/types";
import { colors, spacing } from "@/lib/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const { tenant, user } = useAuth();
  const { data: sessionsData, isLoading: loadingSessions, refetch, isRefetching } = useTodaySessions();
  const { data: attendanceData, isLoading: loadingAtt } = useAttendance();
  const sessions: ClassSession[] = sessionsData ?? [];
  const attendance: AttendanceRecord[] = attendanceData ?? [];

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => refetch()}>
      <StaffHeader title="Operations hub" subtitle={format(new Date(), "EEEE, d MMMM")} tenantName={tenant?.name} />

      <FadeInView delay={0}>
        <View style={styles.quickRow}>
          <QuickAction icon="qr-code" label="Scan" onPress={() => router.push("/(tabs)/scan")} />
          <QuickAction icon="people" label="Members" onPress={() => router.push("/(tabs)/members")} />
          <QuickAction icon="calendar" label="Schedule" onPress={() => router.push("/(tabs)/schedule")} />
        </View>
      </FadeInView>

      <FadeInView delay={50}>
        <View style={styles.stats}>
          <StatCard label="Check-ins today" value={loadingAtt ? "…" : attendance.length} />
          <StatCard label="Classes today" value={loadingSessions ? "…" : sessions.length} />
        </View>
      </FadeInView>

      <FadeInView delay={100}>
        <PrimaryButton label="Open QR scanner" onPress={() => router.push("/(tabs)/scan")} />
      </FadeInView>

      <FadeInView delay={140}>
        <Text style={styles.section}>Recent check-ins</Text>
        {loadingAtt ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : attendance.length === 0 ? (
          <EmptyState title="No check-ins yet today" illustration={<DashboardIllustration size={150} />} />
        ) : (
          attendance.slice(0, 8).map((a, i) => (
            <FadeInView key={a.id} delay={i * 30}>
              <Card>
                <Text style={styles.name}>{a.memberName}</Text>
                <Text style={styles.muted}>{a.checkIn ? format(new Date(a.checkIn), "HH:mm") : "—"}</Text>
              </Card>
            </FadeInView>
          ))
        )}
      </FadeInView>

      <FadeInView delay={180}>
        <Text style={styles.section}>Today's classes</Text>
        {sessions.length === 0 ? (
          <EmptyState title="No classes scheduled" illustration={<DashboardIllustration size={130} />} />
        ) : (
          sessions.map((s, i) => (
            <FadeInView key={s.id} delay={i * 35}>
              <Card>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.muted}>{format(new Date(s.startsAt), "HH:mm")} · {s.bookedCount ?? 0}/{s.capacity}</Text>
              </Card>
            </FadeInView>
          ))
        )}
      </FadeInView>

      {user?.role === "coach" ? <Text style={styles.coachNote}>Coach view — your sessions only</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: spacing.md },
  stats: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  section: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  coachNote: { fontSize: 12, color: colors.textMuted, marginTop: spacing.md, textAlign: "center" },
});
