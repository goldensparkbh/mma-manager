import { useState } from "react";
import { cn } from "@/lib/utils";
import { getClubTypeVisual } from "@/lib/clubTypeIcons";
import { getClubTypeImageUrl } from "@/lib/clubTypeImages";

type Props = {
  clubTypeId: string;
  alt: string;
  className?: string;
  iconClassName?: string;
};

export function ClubTypeImage({ clubTypeId, alt, className, iconClassName }: Props) {
  const src = getClubTypeImageUrl(clubTypeId);
  const [failed, setFailed] = useState(!src);
  const visual = getClubTypeVisual(clubTypeId);
  const Icon = visual.icon;

  if (failed || !src) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          visual.tileClass,
          className,
        )}
      >
        <Icon className={cn("h-10 w-10", iconClassName)} strokeWidth={1.75} aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
