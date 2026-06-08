import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { format } from "date-fns";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import type { ClassSession } from "@/lib/types";

export default function ScheduleScreen() {
  const { api, user } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 14 * 86400000).toISOString();
      const data = await api.get<ClassSession[]>(
        `/api/classes/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setSessions(
        data.filter(
          (s) =>
            (!s.status || s.status === "scheduled") && new Date(s.startsAt) >= new Date(),
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
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#3b82f6" />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        user?.role === "coach" ? (
          <Text style={styles.coachNote}>Showing your assigned classes</Text>
        ) : null
      }
      ListEmptyComponent={<Text style={styles.empty}>No upcoming classes</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.meta}>{format(new Date(item.startsAt), "EEE d MMM · HH:mm")}</Text>
          {item.coachName ? <Text style={styles.meta}>Coach: {item.coachName}</Text> : null}
          {item.location ? <Text style={styles.meta}>{item.location}</Text> : null}
          <Text style={styles.meta}>
            {item.bookedCount ?? 0}/{item.capacity} booked
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  list: { padding: 16 },
  coachNote: { color: "#94a3b8", marginBottom: 12, fontSize: 13 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40 },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#fff" },
  meta: { fontSize: 13, color: "#94a3b8", marginTop: 4 },
});
