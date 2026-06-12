import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { BrandedSplash } from "@/lib/branded-splash";

export default function IndexScreen() {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/(tabs)" : "/login");
  }, [loading, user, router]);

  return <BrandedSplash />;
}
