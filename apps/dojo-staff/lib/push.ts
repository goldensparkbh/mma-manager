import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { createApi } from "./api";

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

export async function registerStaffPush(api: ReturnType<typeof createApi>) {
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
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await api.post("/api/push-token", { token: tokenData.data, platform: Platform.OS });
    registeredThisSession = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
