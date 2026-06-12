import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import * as storage from "@/lib/storage";
import { BrandedSplash } from "@/lib/branded-splash";

export default function BootstrapScreen() {
  const router = useRouter();
  const { loading, member, slug } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    storage.isOnboardingComplete().then(() => setOnboardingChecked(true));
  }, []);

  useEffect(() => {
    if (loading || !onboardingChecked) return;
    (async () => {
      const done = await storage.isOnboardingComplete();
      if (!done) {
        router.replace("/onboarding");
        return;
      }
      if (member && slug) {
        router.replace("/(member)");
        return;
      }
      router.replace("/login");
    })();
  }, [loading, member, slug, router, onboardingChecked]);

  return <BrandedSplash />;
}
