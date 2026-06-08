import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { format } from "date-fns";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import type { Booking, ClassSession } from "@/lib/types";

export default function ClassesScreen() {
  const { api, activeSubscription } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 14 * 86400000).toISOString();
      const [cls, bks] = await Promise.all([
        api.get<ClassSession[]>(`/api/portal/classes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
        api.get<Booking[]>("/api/portal/bookings"),
      ]);
      setSessions(cls);
      setBookings(bks);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const bookedIds = new Set(
    bookings.filter((b) => b.status === "confirmed" || b.status === "waitlist").map((b) => b.sessionId),
  );

  const book = async (sessionId: string) => {
    setBookingId(sessionId);
    try {
      await api.post("/api/portal/bookings", { sessionId });
      await load();
    } finally {
      setBookingId(null);
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No upcoming classes</Text>}
      renderItem={({ item }) => {
        const isBooked = bookedIds.has(item.id);
        const full = (item.bookedCount ?? 0) >= item.capacity;
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.meta}>{format(new Date(item.startsAt), "EEE d MMM · HH:mm")}</Text>
            {item.coachName ? <Text style={styles.meta}>Coach: {item.coachName}</Text> : null}
            {item.location ? <Text style={styles.meta}>{item.location}</Text> : null}
            <Text style={styles.meta}>
              {item.bookedCount ?? 0}/{item.capacity}
            </Text>
            {isBooked ? (
              <Text style={styles.badge}>Booked</Text>
            ) : (
              <Pressable
                style={[styles.btn, (!activeSubscription || bookingId === item.id) && styles.btnDisabled]}
                disabled={!activeSubscription || bookingId === item.id}
                onPress={() => book(item.id)}
              >
                <Text style={styles.btnText}>
                  {bookingId === item.id ? "..." : full ? "Waitlist" : "Book"}
                </Text>
              </Pressable>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  meta: { fontSize: 13, color: "#64748b", marginTop: 4 },
  badge: { marginTop: 10, color: "#16a34a", fontWeight: "600" },
  btn: {
    marginTop: 10,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "600" },
});
