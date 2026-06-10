import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "notification_inbox";
const MAX = 50;

export type InboxNotification = {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  read: boolean;
  data?: Record<string, string>;
};

export async function getNotifications(): Promise<InboxNotification[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as InboxNotification[];
  } catch {
    return [];
  }
}

export async function addNotification(input: { title: string; body: string; data?: Record<string, string> }) {
  const existing = await getNotifications();
  const item: InboxNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    body: input.body,
    receivedAt: new Date().toISOString(),
    read: false,
    data: input.data,
  };
  const next = [item, ...existing].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function markAllRead() {
  const next = (await getNotifications()).map((n) => ({ ...n, read: true }));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearNotifications() {
  await AsyncStorage.removeItem(KEY);
}
