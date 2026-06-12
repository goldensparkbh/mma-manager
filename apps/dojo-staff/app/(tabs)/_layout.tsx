import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useTabBarStyle, useLocalizedTabBarLabelStyle } from "@/lib/tabBar";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const tabBarStyle = useTabBarStyle();
  const tabBarLabelStyle = useLocalizedTabBarLabelStyle();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.today"), tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} /> }} />
      <Tabs.Screen name="scan" options={{ title: t("tabs.scan"), tabBarIcon: ({ color, size }) => <Ionicons name="qr-code" size={size} color={color} /> }} />
      <Tabs.Screen name="schedule" options={{ title: t("tabs.schedule"), tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="members" options={{ title: t("tabs.members"), tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
      <Tabs.Screen name="club" options={{ title: t("tabs.club"), tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} /> }} />
    </Tabs>
  );
}
