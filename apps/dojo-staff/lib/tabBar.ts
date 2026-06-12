import type { TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppFonts } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function useTabBarStyle() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, 8) + 10;

  return {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.border,
    height: 52 + paddingBottom,
    paddingBottom,
    paddingTop: 8,
  };
}

export function useLocalizedTabBarLabelStyle(): TextStyle {
  const { isRtl } = useI18n();
  const { family } = useAppFonts();

  return {
    fontSize: 11,
    fontWeight: "600",
    ...(isRtl ? { fontFamily: family("semibold") } : {}),
  };
}
