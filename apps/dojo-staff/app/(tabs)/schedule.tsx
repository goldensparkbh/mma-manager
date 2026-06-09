import { format, isToday, isTomorrow } from "date-fns";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, StaffHeader } from "@/lib/components";
import { useSessions } from "@/lib/hooks";
import type { ClassSession } from "@/lib/types";
import { colors, spacing } from "@/lib/theme";

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE d MMM");
}

export default function ScheduleScreen() {
  const { tenant, user } = useAuth();
  const { data: sessionsData, isLoading, refetch, isRefetching } = useSessions();
  const sessions: ClassSession[] = sessionsData ?? [];

  const upcoming = sessions
    .filter((s: ClassSession) => (!s.status || s.status === "scheduled") && new Date(s.startsAt) >= new Date())
    .sort((a: ClassSession, b: ClassSession) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <View style={styles.root}>
      <StaffHeader title="Schedule" subtitle="Next 7 days" tenantName={tenant?.name} />
      <FlatList
        data={upcoming}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? <Text style={styles.muted}>Loading…</Text> : <EmptyState title="No upcoming classes" />
        }
        renderItem={({ item, index }) => {
          const showDay =
            index === 0 ||
            format(new Date(item.startsAt), "yyyy-MM-dd") !==
              format(new Date(upcoming[index - 1].startsAt), "yyyy-MM-dd");
          return (
            <>
              {showDay ? <Text style={styles.day}>{dayLabel(new Date(item.startsAt))}</Text> : null}
              <Card>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.muted}>{format(new Date(item.startsAt), "HH:mm")}</Text>
                {item.coachName ? <Text style={styles.muted}>Coach {item.coachName}</Text> : null}
                {item.location ? <Text style={styles.muted}>{item.location}</Text> : null}
                <Text style={styles.spots}>{item.bookedCount ?? 0} / {item.capacity} booked</Text>
              </Card>
            </>
          );
        }}
      />
      {user?.role === "coach" ? <Text style={styles.note}>Coach view — your sessions only</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.md },
  list: { paddingBottom: 100 },
  day: { fontSize: 15, fontWeight: "700", color: colors.primary, marginTop: spacing.md, marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  spots: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 8 },
  note: { textAlign: "center", color: colors.textMuted, fontSize: 12, padding: spacing.md },
});
