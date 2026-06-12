import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/lib/branding";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

import { useTabBarStyle, useLocalizedTabBarLabelStyle } from "@/lib/tabBar";

export default function TabsLayout() {
  const { loading, member, slug } = useAuth();
  const { accent } = useBranding();
  const { t } = useI18n();
  const { colors } = useTheme();
  const tabBarStyle = useTabBarStyle();
  const tabBarLabelStyle = useLocalizedTabBarLabelStyle();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }
  if (!member || !slug) return <Redirect href="/(discover)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle,
        tabBarLabelStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: t("tabs.classes"),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t("tabs.bookings"),
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: t("tabs.pay"),
          tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
