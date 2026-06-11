import { format } from "date-fns";
import { StyleSheet, Text } from "react-native";
import { Card, Screen, StaffHeader } from "@/lib/components";
import { useBookings, useSessions } from "@/lib/hooks";
import { colors } from "@/lib/theme";

export default function RegistrationsScreen() {
  const { data: bookings = [], refetch, isRefetching } = useBookings();
  const { data: sessions = [] } = useSessions();
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  return (
      <Screen scroll refreshing={isRefetching} onRefresh={() => refetch()}>
        <StaffHeader title="Registrations" subtitle="Members booked for upcoming classes" />
        {bookings.length === 0 ? (
          <Text style={styles.empty}>No upcoming class registrations.</Text>
        ) : (
          bookings.map((b) => {
            const session = sessionMap.get(b.sessionId);
            return (
              <Card key={b.id}>
                <Text style={styles.name}>{b.memberName || "Member"}</Text>
                <Text style={styles.meta}>{session?.name || "Class session"}</Text>
                {session?.startsAt ? (
                  <Text style={styles.meta}>{format(new Date(session.startsAt), "EEE, MMM d · h:mm a")}</Text>
                ) : null}
                {b.status ? <Text style={styles.status}>{b.status}</Text> : null}
              </Card>
            );
          })
        )}
      </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  status: { fontSize: 11, fontWeight: "700", color: colors.primary, marginTop: 6, textTransform: "uppercase" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 32 },
});
