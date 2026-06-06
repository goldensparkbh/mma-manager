import { Button } from "@/components/ui/button";
import { setToken } from "@/lib/api";
import { useLanguage } from "@/context/language-context";
import { Eye, LogOut } from "lucide-react";

export function ImpersonationBanner() {
  const { t } = useLanguage();
  const backup = sessionStorage.getItem("admin_token_backup");
  if (!backup) return null;

  const exitImpersonation = () => {
    setToken(backup);
    sessionStorage.removeItem("admin_token_backup");
    window.location.href = "/";
  };

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>{t("admin.impersonating")}</span>
      </div>
      <Button size="sm" variant="secondary" className="h-8" onClick={exitImpersonation}>
        <LogOut className="h-3.5 w-3.5 me-1" />
        {t("admin.exitImpersonation")}
      </Button>
    </div>
  );
}
