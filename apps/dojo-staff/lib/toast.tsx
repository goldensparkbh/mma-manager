import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius } from "./theme";

type Kind = "success" | "error" | "info";
const Ctx = createContext<{ show: (m: string, k?: Kind) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null);
  const show = useCallback((message: string, kind: Kind = "info") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  const fg = toast?.kind === "success" ? colors.success : toast?.kind === "error" ? colors.danger : colors.text;
  return (
    <Ctx.Provider value={value}>
      {children}
      {toast ? (
        <Pressable style={styles.wrap} onPress={() => setToast(null)}>
          <Text style={[styles.text, { color: fg }]}>{toast.message}</Text>
        </Pressable>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast");
  return c;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 48,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { textAlign: "center", fontWeight: "600", fontSize: 15 },
});
