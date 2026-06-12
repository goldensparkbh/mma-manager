import { DevSettings, I18nManager } from "react-native";
import * as Updates from "expo-updates";
import type { Locale } from "./i18n";

/** Apply native RTL layout; returns true when a full reload is required. */
export function applyNativeLayoutDirection(locale: Locale): boolean {
  const rtl = locale === "ar";
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return true;
}

export async function reloadAppForLayoutDirection() {
  if (DevSettings?.reload) {
    DevSettings.reload();
    return;
  }
  await Updates.reloadAsync();
}
