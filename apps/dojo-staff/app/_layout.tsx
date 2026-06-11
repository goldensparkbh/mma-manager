import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { AppQueryProvider } from "@/lib/query";
import { ToastProvider } from "@/lib/toast";

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" options={{ headerShown: true }} />
            <Stack.Screen name="packages" options={{ headerShown: true }} />
            <Stack.Screen name="registrations" options={{ headerShown: true }} />
            <Stack.Screen name="team" options={{ headerShown: true }} />
          </Stack>
        </ToastProvider>
      </AuthProvider>
      </I18nProvider>
    </AppQueryProvider>
  );
}
