import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

/** Shared bottom tab bar styling with extra bottom breathing room */
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
