import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useTabBarStyle, useLocalizedTabBarLabelStyle } from "@/lib/tabBar";

export default function DiscoverLayout() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const tabBarStyle = useTabBarStyle();
  const tabBarLabelStyle = useLocalizedTabBarLabelStyle();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle,
        tabBarLabelStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.explore"),
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clubs"
        options={{
          title: t("tabs.clubs"),
          tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: t("tabs.schedule"),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("tabs.account"),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
