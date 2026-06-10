import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth";
import { BrandingProvider } from "@/lib/branding";
import { I18nProvider } from "@/lib/i18n";
import { AppQueryProvider } from "@/lib/query";
import { setupNotificationListeners } from "@/lib/push";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { ToastProvider } from "@/lib/toast";

function RootStack() {
  const { isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      const parsed = Linking.parse(url);
      if (parsed.path === "payment-result" || parsed.hostname === "payment-result") {
        const tapId = (parsed.queryParams?.tap_id as string) || null;
        router.push({ pathname: "/payment-result", params: tapId ? { tap_id: tapId } : {} });
        return;
      }
      if (parsed.path?.startsWith("club/")) {
        const slug = parsed.path.replace("club/", "");
        if (slug) router.push(`/club/${slug}`);
        return;
      }
      if (parsed.path === "login" && parsed.queryParams?.slug) {
        router.push({ pathname: "/login", params: { slug: String(parsed.queryParams.slug) } });
      }
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => setupNotificationListeners(), []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(discover)" />
        <Stack.Screen name="(member)" />
        <Stack.Screen name="club/[slug]" options={{ presentation: "card" }} />
        <Stack.Screen name="class/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="login" options={{ presentation: "modal" }} />
        <Stack.Screen name="payment-result" options={{ presentation: "modal" }} />
        <Stack.Screen name="notifications" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <BrandingProvider>
              <ToastProvider>
                <RootStack />
              </ToastProvider>
            </BrandingProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </AppQueryProvider>
  );
}
