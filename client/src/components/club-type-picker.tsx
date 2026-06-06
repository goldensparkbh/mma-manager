import { useMemo } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { getClubTypeVisual } from "@/lib/clubTypeIcons";
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

const CATEGORY_ORDER = ["martial_arts", "fitness", "specialty", "hybrid"] as const;

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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wide">
              {t(`clubType.category.${category}`)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {types.map((type) => {
              const visual = getClubTypeVisual(type.id);
              const Icon = visual.icon;
              const selected = value === type.id;
              const name = language === "ar" ? type.nameAr : type.nameEn;
              const description = language === "ar" ? type.descriptionAr : type.descriptionEn;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onChange(type.id)}
                  className={cn(
                    "group relative flex flex-col items-center text-center rounded-xl border-2 p-3 transition-all",
                    "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    selected
                      ? cn("shadow-md bg-primary/5 ring-2 ring-offset-2 ring-offset-background", visual.accentClass)
                      : "border-border bg-card",
                  )}
                  aria-pressed={selected}
                  aria-label={name}
                >
                  {selected && (
                    <span className="absolute top-2 end-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}

                  <div
                    className={cn(
                      "mb-3 flex h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] items-center justify-center rounded-2xl shadow-inner transition-transform group-hover:scale-105",
                      visual.tileClass,
                    )}
                  >
                    <Icon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.75} aria-hidden />
                  </div>

                  <span className="text-sm font-semibold leading-tight line-clamp-2 min-h-[2.5rem] flex items-center">
                    {name}
                  </span>
                  <span className="mt-1 text-[10px] sm:text-xs text-muted-foreground line-clamp-2 leading-snug">
                    {description}
                  </span>

                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {type.progressionEnabled && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                        {t("clubType.picker.progression")}
                      </span>
                    )}
                    {type.hasSessionPackages && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                        {t("clubType.picker.sessions")}
                      </span>
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
