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
              <Stack.Screen name="(discover)" />
              <Stack.Screen name="(member)" />
              <Stack.Screen name="club/[slug]" options={{ presentation: "card" }} />
              <Stack.Screen name="login" options={{ presentation: "modal" }} />
            </Stack>
          </ToastProvider>
        </BrandingProvider>
      </AuthProvider>
    </AppQueryProvider>
  );
}
