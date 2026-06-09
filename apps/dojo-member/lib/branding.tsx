import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "./auth";
import { colors, withAlpha } from "./theme";

type Branding = {
  accent: string;
  accentSoft: string;
  accentMuted: string;
  logoUrl?: string;
  clubName: string;
};

const BrandingContext = createContext<Branding>({
  accent: colors.primary,
  accentSoft: withAlpha(colors.primary, 0.12),
  accentMuted: withAlpha(colors.primary, 0.25),
  clubName: "",
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { portalInfo, clubName } = useAuth();
  const accent = portalInfo?.primaryColor || colors.primary;
  const value = useMemo(
    () => ({
      accent,
      accentSoft: withAlpha(accent, 0.12),
      accentMuted: withAlpha(accent, 0.22),
      logoUrl: portalInfo?.logoUrl,
      clubName,
    }),
    [accent, portalInfo?.logoUrl, clubName],
  );
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
