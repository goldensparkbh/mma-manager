import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "recent_clubs";
const MAX = 12;

export type RecentClub = {
  slug: string;
  name: string;
  clubType?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  visitedAt: string;
};

export async function getRecentClubs(): Promise<RecentClub[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RecentClub[];
  } catch {
    return [];
  }
}

export async function saveRecentClub(club: Omit<RecentClub, "visitedAt">) {
  const existing = await getRecentClubs();
  const next: RecentClub[] = [
    { ...club, visitedAt: new Date().toISOString() },
    ...existing.filter((c) => c.slug !== club.slug),
  ].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
