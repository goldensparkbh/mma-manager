import type { ClubTypeId } from "@shared/clubTypes";

const imageModules = import.meta.glob<string>(
  "../assets/club-types/*.png",
  { eager: true, import: "default" },
);

const CLUB_TYPE_IMAGE_URLS: Partial<Record<ClubTypeId, string>> = {};

for (const [path, url] of Object.entries(imageModules)) {
  const id = path.match(/\/([^/]+)\.png$/)?.[1];
  if (id) CLUB_TYPE_IMAGE_URLS[id as ClubTypeId] = url;
}

export function getClubTypeImageUrl(id: string): string | undefined {
  return CLUB_TYPE_IMAGE_URLS[id as ClubTypeId];
}

export function hasClubTypeImage(id: string): boolean {
  return !!getClubTypeImageUrl(id);
}

export function getAllClubTypeImages(): { id: string; url: string }[] {
  return Object.entries(CLUB_TYPE_IMAGE_URLS)
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([id, url]) => ({ id, url }));
}
