import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserRole } from "@shared/schema";

type AuthContextValue = {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchUserRole(userId: string): Promise<UserRole | null> {
  try {
    const docRef = doc(db, "users", userId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as { role?: UserRole | null };
    return data.role ?? null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fallback timer in case Firebase doesn't respond quickly
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      // Keep safety timer running to guarantee loading finishes
      setUser(authUser);
      if (!authUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const userRole = await fetchUserRole(authUser.uid);
        if (!userRole) {
          try {
            await setDoc(doc(db, "users", authUser.uid), { role: "staff" }, { merge: true });
          } catch (e) {
            console.error("Error creating user profile:", e);
          }
        }
        setRole(userRole ?? "staff");
      } catch (error) {
        console.error("Auth error:", error);
        setRole("staff");
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const signOutUser = async () => {
    await signOut(auth);
  };

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      signOutUser,
    }),
    [user, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
