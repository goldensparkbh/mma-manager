import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { I18nManager } from "react-native";

export type Locale = "en" | "ar";
const LOCALE_KEY = "staff_locale";

const messages = {
  en: {
    "app.name": "Nawady Staff",
    "tabs.today": "Today",
    "tabs.scan": "Scan",
    "tabs.schedule": "Schedule",
    "tabs.members": "Members",
    "tabs.profile": "Profile",
    "login.brand": "Nawady Staff",
    "login.email": "Email",
    "login.password": "Password",
    "login.signIn": "Sign in",
    "profile.signOut": "Sign out",
    "profile.language": "Language",
    "common.search": "Search name or phone…",
  },
  ar: {
    "app.name": "نوادي — الموظفين",
    "tabs.today": "اليوم",
    "tabs.scan": "مسح",
    "tabs.schedule": "الجدول",
    "tabs.members": "الأعضاء",
    "tabs.profile": "الملف",
    "login.brand": "نوادي — الموظفين",
    "login.email": "البريد",
    "login.password": "كلمة المرور",
    "login.signIn": "دخول",
    "profile.signOut": "تسجيل الخروج",
    "profile.language": "اللغة",
    "common.search": "ابحث بالاسم أو الهاتف…",
  },
} as const;

type Key = keyof typeof messages.en;

const Ctx = createContext<{
  locale: Locale;
  t: (k: Key) => string;
  setLocale: (l: Locale) => Promise<void>;
} | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(LOCALE_KEY);
      const l = saved === "ar" ? "ar" : "en";
      I18nManager.allowRTL(l === "ar");
      I18nManager.forceRTL(l === "ar");
      setLocaleState(l);
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    await AsyncStorage.setItem(LOCALE_KEY, l);
    I18nManager.allowRTL(l === "ar");
    I18nManager.forceRTL(l === "ar");
    setLocaleState(l);
  }, []);

  const t = useCallback((k: Key) => messages[locale][k] ?? messages.en[k], [locale]);
  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);
  if (!ready) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n required");
  return ctx;
}
