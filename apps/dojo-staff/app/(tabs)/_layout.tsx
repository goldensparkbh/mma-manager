import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.today"), tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} /> }} />
      <Tabs.Screen name="scan" options={{ title: t("tabs.scan"), tabBarIcon: ({ color, size }) => <Ionicons name="qr-code" size={size} color={color} /> }} />
      <Tabs.Screen name="schedule" options={{ title: t("tabs.schedule"), tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="members" options={{ title: t("tabs.members"), tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile"), tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}
