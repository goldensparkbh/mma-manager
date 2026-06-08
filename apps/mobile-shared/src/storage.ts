import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getSecure(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecure(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export async function getItem(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
