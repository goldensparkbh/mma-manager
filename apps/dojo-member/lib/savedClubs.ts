import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "saved_clubs";
const MAX = 12;

export type SavedClub = {
  slug: string;
  name: string;
  clubType?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  savedAt: string;
};

export async function getSavedClubs(): Promise<SavedClub[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedClub[];
  } catch {
    return [];
  }
}

export async function saveClub(club: Omit<SavedClub, "savedAt">) {
  const existing = await getSavedClubs();
  const next: SavedClub[] = [
    { ...club, savedAt: new Date().toISOString() },
    ...existing.filter((c) => c.slug !== club.slug),
  ].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeSavedClub(slug: string) {
  const next = (await getSavedClubs()).filter((c) => c.slug !== slug);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
