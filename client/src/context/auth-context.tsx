import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc, getDocs, collection, query, where, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserRole } from "@shared/schema";

type AuthContextValue = {
  user: User | null;
  role: string | null; // Changed from UserRole to string to support custom roles
  permissions: string[];
  loading: boolean;
  clubSettings: {
    name: string;
    logoUrl: string;
    phone: string;
    location: string;
    socials: {
      facebook: string;
      instagram: string;
      twitter: string;
    };
  } | null;
  signOutUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refreshClubSettings: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchUserRole(userId: string): Promise<string | null> {
  try {
    const docRef = doc(db, "users", userId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return data.role ?? null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

async function fetchRolePermissions(roleId: string): Promise<string[]> {
  if (roleId === 'admin') return ['*']; // Admin has all permissions wildcard
  try {
    const docRef = doc(db, "roles", roleId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return [];
    return snapshot.data().permissions || [];
  } catch (error) {
    console.error("Error fetching role settings:", error);
    return [];
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubSettings, setClubSettings] = useState<AuthContextValue['clubSettings']>(null);

  const fetchClubSettings = async () => {
    try {
      const docRef = doc(db, "settings", "general");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setClubSettings({
          name: data.name || "Club Manager",
          logoUrl: data.logoUrl || "/logo_dark_icon.svg",
          phone: data.phone || "",
          location: data.location || "",
          socials: {
            facebook: data.socials?.facebook || "",
            instagram: data.socials?.instagram || "",
            twitter: data.socials?.twitter || "",
          }
        });
      } else {
        setClubSettings({
          name: "Club Manager",
          logoUrl: "/logo_dark_icon.svg",
          phone: "",
          location: "",
          socials: { facebook: "", instagram: "", twitter: "" }
        });
      }
    } catch (error) {
      console.error("Error fetching club settings:", error);
    }
  };

  useEffect(() => {
    fetchClubSettings(); // Initial fetch

    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (!authUser) {
        setRole(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        let userRole = await fetchUserRole(authUser.uid);
        let userDisplayName = authUser.displayName;

        // If no role found (first login?), check invites
        if (!userRole && authUser.email) {
          const q = query(collection(db, "user_invites"), where("email", "==", authUser.email));
          const inviteSnap = await getDocs(q);
          if (!inviteSnap.empty) {
            const inviteDoc = inviteSnap.docs[0];
            const inviteData = inviteDoc.data();
            userRole = inviteData.role;
            userDisplayName = inviteData.name; // Use invite name if available

            // Cleanup invite? keeping it for history for now, or delete.
            // Let's delete it so they don't get double counted in lists
            await deleteDoc(doc(db, "user_invites", inviteDoc.id));
          }
        }

        // Sync basic profile
        await setDoc(doc(db, "users", authUser.uid), {
          email: authUser.email,
          displayName: userDisplayName || authUser.displayName,
          photoURL: authUser.photoURL,
          lastLogin: new Date().toISOString(),
          role: userRole || "staff"
        }, { merge: true });

        userRole = userRole || "staff";
        setRole(userRole);

        // Fetch permissions for this role
        const perms = await fetchRolePermissions(userRole);
        setPermissions(perms);

      } catch (error) {
        console.error("Auth error:", error);
        setRole("staff");
        setPermissions([]);
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

  const hasPermission = (permission: string) => {
    if (!role) return false;
    if (permissions.includes('*')) return true; // Admin wildcard
    return permissions.includes(permission);
  };

  const value = useMemo(
    () => ({
      user,
      role,
      permissions,
      loading,
      clubSettings,
      signOutUser,
      hasPermission,
      refreshClubSettings: fetchClubSettings,
    }),
    [user, role, permissions, loading, clubSettings]
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
