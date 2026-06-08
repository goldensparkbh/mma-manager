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
import type { CampEvent } from "@/lib/types";

export default function CampsScreen() {
  const { api } = useAuth();
  const [camps, setCamps] = useState<CampEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCamps(await api.get<CampEvent[]>("/api/portal/camps"));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const register = async (id: string) => {
    setRegistering(id);
    setMessage("");
    try {
      await api.post(`/api/portal/camps/${id}/register`, {});
      setMessage("Registered successfully!");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setRegistering(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {message ? <Text style={styles.banner}>{message}</Text> : null}
      <FlatList
        data={camps}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#3b82f6" />
          ) : (
            <Text style={styles.empty}>No public events</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>{format(new Date(item.startDate), "EEE d MMM · HH:mm")}</Text>
            {item.price != null ? <Text style={styles.meta}>{item.price} BHD</Text> : null}
            <Pressable
              style={styles.btn}
              disabled={registering === item.id}
              onPress={() => register(item.id)}
            >
              <Text style={styles.btnText}>{registering === item.id ? "..." : "Register"}</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: "#dbeafe", color: "#1e40af", padding: 12, textAlign: "center" },
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
  btn: {
    marginTop: 10,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
