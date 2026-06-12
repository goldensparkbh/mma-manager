import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from "@expo-google-fonts/cairo";
import React, { createContext, useContext, useMemo } from "react";
import type { TextStyle } from "react-native";
import { BrandedSplash } from "./branded-splash";
import { useI18n } from "./i18n";

type FontWeight = "regular" | "semibold" | "bold";

type FontsContextValue = {
  loaded: boolean;
  family: (weight?: FontWeight) => string | undefined;
  text: (weight?: FontWeight, extra?: TextStyle) => TextStyle;
};

const FontsContext = createContext<FontsContextValue | null>(null);

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const value = useMemo<FontsContextValue>(
    () => ({
      loaded,
      family: (weight = "regular") => {
        if (weight === "bold") return "Cairo_700Bold";
        if (weight === "semibold") return "Cairo_600SemiBold";
        return "Cairo_400Regular";
      },
      text: (weight = "regular", extra) => {
        const map: Record<FontWeight, string> = {
          regular: "Cairo_400Regular",
          semibold: "Cairo_600SemiBold",
          bold: "Cairo_700Bold",
        };
        return { fontFamily: map[weight], ...extra };
      },
    }),
    [loaded],
  );

  if (!loaded) return <BrandedSplash />;

  return <FontsContext.Provider value={value}>{children}</FontsContext.Provider>;
}

export function useAppFonts() {
  const ctx = useContext(FontsContext);
  if (!ctx) throw new Error("useAppFonts requires FontProvider");
  return ctx;
}

/** RTL-aware text styles with Cairo when locale is Arabic */
export function useTypography() {
  const { isRtl } = useI18n();
  const { family, text } = useAppFonts();

  return useMemo(
    () => ({
      isRtl,
      font: (weight: FontWeight = "regular") => (isRtl ? family(weight) : undefined),
      style: (weight: FontWeight = "regular", extra?: TextStyle): TextStyle => ({
        ...(isRtl ? text(weight) : {}),
        textAlign: isRtl ? "right" : ("left" as const),
        writingDirection: isRtl ? "rtl" : ("ltr" as const),
        ...extra,
      }),
      row: isRtl ? ({ flexDirection: "row-reverse" as const } satisfies TextStyle) : {},
    }),
    [isRtl, family, text],
  );
}
