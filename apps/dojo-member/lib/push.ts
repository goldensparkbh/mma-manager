import AsyncStorage from "@react-native-async-storage/async-storage";
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
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PERMISSION_ASKED_KEY = "push_permission_asked";
let registeredThisSession = false;
let inFlight: Promise<void> | null = null;

export async function registerMemberPush(api: ReturnType<typeof createApi>) {
  if (Platform.OS === "web" || !Device.isDevice) return;
  if (registeredThisSession) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { status: existing, canAskAgain } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      // Only ever show the OS permission dialog once; afterwards the user can
      // change it from system settings.
      const alreadyAsked = (await AsyncStorage.getItem(PERMISSION_ASKED_KEY)) === "1";
      if (alreadyAsked || !canAskAgain) return;
      await AsyncStorage.setItem(PERMISSION_ASKED_KEY, "1");
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
    registeredThisSession = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export function setupNotificationListeners(onNavigate?: (path: string) => void) {
  const received = Notifications.addNotificationReceivedListener((event) => {
    const content = event.request.content;
    addNotification({
      title: content.title || "Nawady",
      body: content.body || "",
      data: (content.data as Record<string, string>) || undefined,
    }).catch(() => {});
  });

  const response = Notifications.addNotificationResponseReceivedListener((event) => {
    const data = event.notification.request.content.data as Record<string, string> | undefined;
    if (!onNavigate || !data) return;
    if (data.clubSlug) onNavigate(`/club/${data.clubSlug}`);
    else if (data.screen === "notifications") onNavigate("/notifications");
    else if (data.screen === "bookings") onNavigate("/(member)/bookings");
  });

  return () => {
    received.remove();
    response.remove();
  };
}
