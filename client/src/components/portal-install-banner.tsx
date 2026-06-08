import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export function PortalInstallBanner() {
  const { t } = useLanguage();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("portal-install-dismissed") === "1",
  );
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || dismissed || !deferred) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismiss = () => {
    sessionStorage.setItem("portal-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3">
      <div className="text-sm">
        <p className="font-medium">{t("portal.installTitle")}</p>
        <p className="text-muted-foreground text-xs">{t("portal.installHint")}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="sm" onClick={install}>
          <Download className="h-4 w-4 me-1" />
          {t("portal.install")}
        </Button>
        <Button size="icon" variant="ghost" onClick={dismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
