import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";

type Props = {
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  centered?: boolean;
};

export function PlatformBranding({
  className,
  titleClassName = "font-bold",
  subtitleClassName = "text-xs text-muted-foreground",
  centered = false,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className={cn(centered && "text-center", className)}>
      <div className={titleClassName}>{t("common.appName")}</div>
      <div className={subtitleClassName}>{t("common.appSubtitle")}</div>
    </div>
  );
}
