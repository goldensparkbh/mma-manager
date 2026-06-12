import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";

type Props = {
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  centered?: boolean;
  /** Show colored Nawady wordmark image instead of text */
  showLogo?: boolean;
  logoClassName?: string;
  hideSubtitle?: boolean;
};

export function PlatformBranding({
  className,
  titleClassName = "font-bold",
  subtitleClassName = "text-xs text-muted-foreground",
  centered = false,
  showLogo = false,
  logoClassName = "h-10 w-auto object-contain",
  hideSubtitle = true,
}: Props) {
  const { t } = useLanguage();

  if (showLogo) {
    return (
      <div className={cn(centered && "text-center flex flex-col items-center", className)}>
        <img src="/nawady-logo.png" alt={t("common.appName")} className={logoClassName} />
        {!hideSubtitle ? (
          <div className={cn(subtitleClassName, "mt-1")}>{t("common.appSubtitle")}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn(centered && "text-center", className)}>
      <div className={titleClassName}>{t("common.appName")}</div>
      {!hideSubtitle ? <div className={subtitleClassName}>{t("common.appSubtitle")}</div> : null}
    </div>
  );
}
