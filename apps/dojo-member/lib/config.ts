import Constants from "expo-constants";

export function getApiUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return (
    process.env.EXPO_PUBLIC_API_URL ||
    extra?.apiUrl ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
