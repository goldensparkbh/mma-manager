import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { useClubConfig } from "@/lib/clubConfig";
import type { ProgressionConfig, ModuleConfig } from "@shared/clubTypes";
import { Loader2, Dumbbell } from "lucide-react";
import { ClubTypeImage } from "@/components/club-type-image";

type ClubTypeOption = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: string;
  imageUrl?: string | null;
  progressionEnabled: boolean;
};

export function ClubTypeSettings() {
  const { refreshClubSettings, hasPermission } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { clubType, progression, modules } = useClubConfig();
  const canEdit = hasPermission("settings.edit");

  const [progressionConfig, setProgressionConfig] = useState<ProgressionConfig>(progression);
  const [moduleConfig, setModuleConfig] = useState<ModuleConfig>(modules);
  const [saving, setSaving] = useState(false);

  const { data: clubTypes = [] } = useQuery<ClubTypeOption[]>({
    queryKey: ["/api/club-types"],
    queryFn: () => apiJson("/api/club-types"),
  });

  const current = clubTypes.find((c) => c.id === clubType);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiJson("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ progressionConfig, moduleConfig }),
      });
      await refreshClubSettings();
      toast({ title: t("common.success"), description: t("clubType.saveSuccess") });
    } catch (err) {
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = async (typeId: string) => {
    if (!confirm(t("clubType.applyConfirm"))) return;
    setSaving(true);
    try {
      await apiJson("/api/settings/apply-club-type", {
        method: "POST",
        body: JSON.stringify({ clubType: typeId }),
      });
      await refreshClubSettings();
      toast({ title: t("common.success"), description: t("clubType.applySuccess") });
      window.location.reload();
    } catch (err) {
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            {t("clubType.currentType")}
          </CardTitle>
          <CardDescription>{t("clubType.currentTypeDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {current && (
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5">
                <ClubTypeImage
                  clubTypeId={current.id}
                  imageUrl={current.imageUrl}
                  alt={language === "ar" ? current.nameAr : current.nameEn}
                />
              </div>
              <div>
                <Badge variant="secondary">{current.category}</Badge>
                <p className="font-semibold text-lg mt-1">
                  {language === "ar" ? current.nameAr : current.nameEn}
                </p>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {current ? (language === "ar" ? current.descriptionAr : current.descriptionEn) : clubType}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("clubType.progressionTitle")}</CardTitle>
          <CardDescription>{t("clubType.progressionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t("clubType.progressionEnabled")}</Label>
            <Switch
              checked={progressionConfig.enabled}
              disabled={!canEdit}
              onCheckedChange={(v) => setProgressionConfig({ ...progressionConfig, enabled: v })}
            />
          </div>
          {progressionConfig.enabled && (
            <>
              <div className="space-y-2">
                <Label>{t("clubType.progressionMode")}</Label>
                <Select
                  value={progressionConfig.mode}
                  disabled={!canEdit}
                  onValueChange={(v) =>
                    setProgressionConfig({ ...progressionConfig, mode: v as ProgressionConfig["mode"] })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="belts">{t("clubType.mode.belts")}</SelectItem>
                    <SelectItem value="levels">{t("clubType.mode.levels")}</SelectItem>
                    <SelectItem value="ranks">{t("clubType.mode.ranks")}</SelectItem>
                    <SelectItem value="badges">{t("clubType.mode.badges")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>{t("clubType.showStripes")}</Label>
                <Switch
                  checked={progressionConfig.showStripes}
                  disabled={!canEdit}
                  onCheckedChange={(v) => setProgressionConfig({ ...progressionConfig, showStripes: v })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("clubType.modulesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{t("clubType.moduleStore")}</Label>
            <Switch
              checked={moduleConfig.store}
              disabled={!canEdit}
              onCheckedChange={(v) => setModuleConfig({ ...moduleConfig, store: v })}
            />
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("common.saveChanges")}
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("clubType.switchType")}</CardTitle>
          <CardDescription>{t("clubType.switchTypeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                disabled={!canEdit || saving || type.id === clubType}
                onClick={() => handleApplyTemplate(type.id)}
                className={`text-start overflow-hidden rounded-lg border transition-colors ${
                  type.id === clubType ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:border-primary/50"
                } disabled:opacity-50`}
              >
                <div className="h-20 w-full">
                  <ClubTypeImage
                    clubTypeId={type.id}
                    imageUrl={type.imageUrl}
                    alt={language === "ar" ? type.nameAr : type.nameEn}
                  />
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm">{language === "ar" ? type.nameAr : type.nameEn}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {language === "ar" ? type.descriptionAr : type.descriptionEn}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
