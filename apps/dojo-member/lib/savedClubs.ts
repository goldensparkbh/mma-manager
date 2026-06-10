import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "favorite_clubs";
const MAX = 24;

export type SavedClub = {
  slug: string;
  name: string;
  clubType?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  savedAt: string;
};

export async function getFavoriteClubs(): Promise<SavedClub[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedClub[];
  } catch {
    return [];
  }
}

/** @deprecated use getFavoriteClubs */
export async function getSavedClubs() {
  return getFavoriteClubs();
}

export async function saveFavoriteClub(club: Omit<SavedClub, "savedAt">) {
  const existing = await getFavoriteClubs();
  const next: SavedClub[] = [
    { ...club, savedAt: new Date().toISOString() },
    ...existing.filter((c) => c.slug !== club.slug),
  ].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeFavoriteClub(slug: string) {
  const next = (await getFavoriteClubs()).filter((c) => c.slug !== slug);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

/** @deprecated */
export async function removeSavedClub(slug: string) {
  return removeFavoriteClub(slug);
}

export async function isClubFavorite(slug: string) {
  return (await getFavoriteClubs()).some((c) => c.slug === slug);
}

/** @deprecated */
export async function isClubSaved(slug: string) {
  return isClubFavorite(slug);
}

export async function toggleFavoriteClub(club: Omit<SavedClub, "savedAt">) {
  const saved = await isClubFavorite(club.slug);
  if (saved) {
    await removeFavoriteClub(club.slug);
    return false;
  }
  await saveFavoriteClub(club);
  return true;
}

/** @deprecated */
export async function toggleSavedClub(club: Omit<SavedClub, "savedAt">) {
  return toggleFavoriteClub(club);
}
