import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { createApi } from "./api";
import { addNotification } from "./notificationsStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerMemberPush(api: ReturnType<typeof createApi>) {
  if (!Device.isDevice) return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  await api.post("/api/portal/push-token", {
    token: tokenData.data,
    platform: Platform.OS,
  });
}

export function setupNotificationListeners() {
  const received = Notifications.addNotificationReceivedListener((event) => {
    const content = event.request.content;
    addNotification({
      title: content.title || "Nawady",
      body: content.body || "",
      data: (content.data as Record<string, string>) || undefined,
    }).catch(() => {});
  });

  const response = Notifications.addNotificationResponseReceivedListener(() => {
    // Navigation handled by deep link data if present
  });

  return () => {
    received.remove();
    response.remove();
  };
}
