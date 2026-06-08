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
import type { Booking } from "@/lib/types";

export default function BookingsScreen() {
  const { api } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Booking[]>("/api/portal/bookings");
      setBookings(
        data.filter(
          (b) =>
            (b.status === "confirmed" || b.status === "waitlist") &&
            b.startsAt &&
            new Date(b.startsAt) > new Date(),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const cancel = async (id: string) => {
    setCancelling(id);
    try {
      await api.delete(`/api/portal/bookings/${id}`);
      await load();
    } finally {
      setCancelling(null);
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No upcoming bookings</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.sessionName}</Text>
          {item.startsAt ? (
            <Text style={styles.meta}>{format(new Date(item.startsAt), "EEE d MMM · HH:mm")}</Text>
          ) : null}
          <Text style={styles.meta}>Status: {item.status}</Text>
          <Pressable
            style={styles.btnOutline}
            disabled={cancelling === item.id}
            onPress={() => cancel(item.id)}
          >
            <Text style={styles.btnOutlineText}>{cancelling === item.id ? "..." : "Cancel"}</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13, color: "#64748b", marginTop: 4 },
  btnOutline: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  btnOutlineText: { color: "#dc2626", fontWeight: "600" },
});
