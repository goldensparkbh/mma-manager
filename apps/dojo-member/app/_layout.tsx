import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { BrandingProvider } from "@/lib/branding";
import { AppQueryProvider } from "@/lib/query";
import { ToastProvider } from "@/lib/toast";

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <AuthProvider>
        <BrandingProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ToastProvider>
        </BrandingProvider>
      </AuthProvider>
    </AppQueryProvider>
  );
}
