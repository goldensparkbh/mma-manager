import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as storage from "@/lib/storage";
import { BrandedSplash } from "@/lib/branded-splash";

export default function BootstrapScreen() {
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    storage.isOnboardingComplete().then(() => setOnboardingChecked(true));
  }, []);

  useEffect(() => {
    if (!onboardingChecked) return;
    (async () => {
      const done = await storage.isOnboardingComplete();
      if (!done) {
        router.replace("/onboarding");
        return;
      }
      router.replace("/(discover)");
    })();
  }, [router, onboardingChecked]);

  return <BrandedSplash />;
}
