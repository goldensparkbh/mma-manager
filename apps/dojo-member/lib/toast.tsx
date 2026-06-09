import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "./theme";

type ToastKind = "success" | "error" | "info";

type ToastState = { message: string; kind: ToastKind } | null;

const ToastContext = createContext<{
  show: (message: string, kind?: ToastKind) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  const bg =
    toast?.kind === "success" ? "#dcfce7" : toast?.kind === "error" ? colors.dangerBg : colors.card;
  const fg =
    toast?.kind === "success" ? colors.success : toast?.kind === "error" ? colors.danger : colors.text;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Pressable style={styles.wrap} onPress={() => setToast(null)}>
          <Animated.View style={[styles.toast, { backgroundColor: bg }]}>
            <Text style={[styles.text, { color: fg }]}>{toast.message}</Text>
          </Animated.View>
        </Pressable>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast required");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 48,
    zIndex: 999,
  },
  toast: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { fontSize: 15, fontWeight: "600", textAlign: "center" },
});
