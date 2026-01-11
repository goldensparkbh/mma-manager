import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const storedConfig = typeof window !== 'undefined' ? localStorage.getItem("firebase_custom_config") : null;
const dynamicConfig = storedConfig ? JSON.parse(storedConfig) : null;

const firebaseConfig = {
  apiKey: dynamicConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: dynamicConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dynamicConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: dynamicConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dynamicConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dynamicConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
