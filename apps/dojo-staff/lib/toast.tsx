import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTypography } from "./fonts";
import { radius, useThemeColors } from "./theme";

type Kind = "success" | "error" | "info";
const Ctx = createContext<{ show: (m: string, k?: Kind) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null);
  const colors = useThemeColors();
  const typo = useTypography();

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
        <Pressable
          style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setToast(null)}
        >
          <Text style={[styles.text, { color: fg }, typo.style("semibold")]}>{toast.message}</Text>
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
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
  },
  text: { textAlign: "center", fontWeight: "600", fontSize: 15 },
});
