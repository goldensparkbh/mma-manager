import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { FontProvider, LocaleUiDefaults, useAppFonts } from "@/lib/fonts";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { AppQueryProvider } from "@/lib/query";
import { ToastProvider } from "@/lib/toast";
import { ThemeProvider, useTheme, useThemeColors } from "@/lib/theme";

function RootStack() {
  const { isDark } = useTheme();
  const colors = useThemeColors();
  const { t, isRtl } = useI18n();
  const { family } = useAppFonts();
  const headerFont = isRtl ? family("bold") : undefined;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: "700",
            ...(headerFont ? { fontFamily: headerFont } : {}),
          },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ headerShown: true, title: t("settings.title") }} />
        <Stack.Screen name="packages" options={{ headerShown: true, title: t("packages.title") }} />
        <Stack.Screen name="registrations" options={{ headerShown: true, title: t("registrations.title") }} />
        <Stack.Screen name="team" options={{ headerShown: true, title: t("team.title") }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <FontProvider>
        <ThemeProvider>
          <I18nProvider>
            <LocaleUiDefaults>
              <AuthProvider>
                <ToastProvider>
                  <RootStack />
                </ToastProvider>
              </AuthProvider>
            </LocaleUiDefaults>
          </I18nProvider>
        </ThemeProvider>
      </FontProvider>
    </AppQueryProvider>
  );
}
