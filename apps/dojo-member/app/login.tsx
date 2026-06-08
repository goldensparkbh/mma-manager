import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { clubName, login, requestOtp, loginWithOtp } = useAuth();
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try {
      await fn();
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>{clubName || "Member login"}</Text>
      <View style={styles.tabs}>
        <Pressable onPress={() => setMode("otp")} style={[styles.tab, mode === "otp" && styles.tabActive]}>
          <Text style={mode === "otp" ? styles.tabTextActive : styles.tabText}>OTP</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("password")}
          style={[styles.tab, mode === "password" && styles.tabActive]}
        >
          <Text style={mode === "password" ? styles.tabTextActive : styles.tabText}>Password</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Phone"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {mode === "password" ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={styles.button}
            disabled={loading || !phone || !password}
            onPress={() => run(() => login(phone, password))}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
          </Pressable>
        </>
      ) : !otpSent ? (
        <Pressable
          style={styles.button}
          disabled={loading || !phone}
          onPress={() =>
            run(async () => {
              await requestOtp(phone);
              setOtpSent(true);
            })
          }
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send code</Text>}
        </Pressable>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <Pressable
            style={styles.button}
            disabled={loading || code.length < 6}
            onPress={() => run(() => loginWithOtp(phone, code))}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
          </Pressable>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>Change club</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#f8fafc" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 20, color: "#0f172a" },
  tabs: { flexDirection: "row", marginBottom: 16, backgroundColor: "#e2e8f0", borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { color: "#64748b" },
  tabTextActive: { color: "#0f172a", fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#dc2626", textAlign: "center", marginTop: 12 },
  link: { color: "#3b82f6", textAlign: "center", marginTop: 20 },
});
