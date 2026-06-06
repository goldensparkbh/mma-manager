import { useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import {
  DEFAULT_MODULES,
  DEFAULT_PROGRESSION,
  parseMemberFieldConfig,
  parseModuleConfig,
  parseProgressionConfig,
  type MemberFieldConfig,
  type ModuleConfig,
  type ProgressionConfig,
} from "@shared/clubTypes";

export type ClubSettingsExtended = {
  clubType?: string;
  progressionConfig?: ProgressionConfig;
  memberFieldConfig?: MemberFieldConfig;
  moduleConfig?: ModuleConfig;
};

export function useClubConfig() {
  const { clubSettings } = useAuth();
  const { language } = useLanguage();

  return useMemo(() => {
    const ext = clubSettings as ClubSettingsExtended | null;
    const progression = parseProgressionConfig(ext?.progressionConfig ?? DEFAULT_PROGRESSION);
    const modules = parseModuleConfig(ext?.moduleConfig ?? DEFAULT_MODULES);
    const memberFields = parseMemberFieldConfig(ext?.memberFieldConfig);
    const isAr = language === "ar";

    const progressionLabel = isAr ? progression.labelAr : progression.label;
    const progressionSingular = isAr ? progression.singularLabelAr : progression.singularLabel;

    return {
      clubType: ext?.clubType || "hybrid",
      progression,
      modules,
      memberFields,
      progressionEnabled: progression.enabled && modules.progression,
      progressionLabel,
      progressionSingular,
      showBeltsNav: progression.enabled && modules.belts,
      showStore: modules.store,
      isFieldVisible: (field: keyof Omit<MemberFieldConfig, "customFields">) =>
        memberFields[field] !== false,
    };
  }, [clubSettings, language]);
}
