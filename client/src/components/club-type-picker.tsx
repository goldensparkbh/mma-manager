import { useMemo } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { getClubTypeVisual } from "@/lib/clubTypeIcons";
import { ClubTypeImage } from "@/components/club-type-image";

export type ClubTypeOption = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: string;
  progressionEnabled?: boolean;
  hasSessionPackages?: boolean;
};

const CATEGORY_ORDER = ["martial_arts", "team_sports", "fitness", "specialty", "hybrid"] as const;

type Props = {
  clubTypes: ClubTypeOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export function ClubTypePicker({ clubTypes, value, onChange, className }: Props) {
  const { t, language } = useLanguage();

  const grouped = useMemo(() => {
    const groups: Record<string, ClubTypeOption[]> = {};
    for (const type of clubTypes) {
      if (!groups[type.category]) groups[type.category] = [];
      groups[type.category].push(type);
    }
    return CATEGORY_ORDER.filter((c) => groups[c]?.length).map((category) => ({
      category,
      types: groups[category],
    }));
  }, [clubTypes]);

  return (
    <div className={cn("space-y-8", className)}>
      {grouped.map(({ category, types }) => (
        <section key={category} className="space-y-3">
          <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wide">
            {t(`clubType.category.${category}`)}
          </Badge>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {types.map((type) => {
              const visual = getClubTypeVisual(type.id);
              const selected = value === type.id;
              const name = language === "ar" ? type.nameAr : type.nameEn;
              const description = language === "ar" ? type.descriptionAr : type.descriptionEn;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onChange(type.id)}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-xl border-2 text-center transition-all",
                    "hover:shadow-lg hover:-translate-y-0.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    selected
                      ? cn("shadow-lg ring-2 ring-offset-2 ring-offset-background", visual.accentClass)
                      : "border-border bg-card hover:border-primary/40",
                  )}
                  aria-pressed={selected}
                  aria-label={name}
                >
                  {selected && (
                    <span className="absolute top-2 end-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}

                  {/* Full-bleed image */}
                  <div className="relative aspect-[4/3] w-full bg-muted">
                    <ClubTypeImage clubTypeId={type.id} alt={name} />
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  </div>

                  <div className="flex flex-col gap-1 p-3 w-full">
                    <span className="text-sm font-bold leading-tight line-clamp-2">{name}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 leading-snug">
                      {description}
                    </span>
                    {(type.progressionEnabled || type.hasSessionPackages) && (
                      <div className="mt-1 flex flex-wrap justify-center gap-1">
                        {type.progressionEnabled && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                            {t("clubType.picker.progression")}
                          </span>
                        )}
                        {type.hasSessionPackages && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                            {t("clubType.picker.sessions")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
