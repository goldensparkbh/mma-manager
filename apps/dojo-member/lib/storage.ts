import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "portal_token";
const SLUG_KEY = "club_slug";
const useSecureStore = Platform.OS !== "web";

async function getSecureItem(key: string) {
  if (useSecureStore) return SecureStore.getItemAsync(key);
  return AsyncStorage.getItem(key);
}

async function setSecureItem(key: string, value: string) {
  if (useSecureStore) return SecureStore.setItemAsync(key, value);
  return AsyncStorage.setItem(key, value);
}

async function deleteSecureItem(key: string) {
  if (useSecureStore) return SecureStore.deleteItemAsync(key);
  return AsyncStorage.removeItem(key);
}

export async function getToken() {
  return getSecureItem(TOKEN_KEY);
}

export async function setToken(token: string) {
  await setSecureItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await deleteSecureItem(TOKEN_KEY);
}

export async function getSlug() {
  return AsyncStorage.getItem(SLUG_KEY);
}

export async function setSlug(slug: string) {
  await AsyncStorage.setItem(SLUG_KEY, slug.trim().toLowerCase());
}

export async function clearSlug() {
  await AsyncStorage.removeItem(SLUG_KEY);
}
