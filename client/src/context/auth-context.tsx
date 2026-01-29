import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc, getDocs, collection, query, where, deleteDoc, limit } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { normalizeWhatsAppTemplates, type WhatsAppTemplate } from "@/lib/whatsapp";
import type { UserRole } from "@shared/schema";

type AuthContextValue = {
  user: User | null;
  role: string | null;
  permissions: string[];
  loading: boolean;
  setupRequired: boolean; // Add this
  clubSettings: {
    name: string;
    logoUrl: string;
    logoUrlLight?: string;
    logoUrlDark?: string;
    managerEmail: string;
    whatsappTemplate?: string;
    whatsappTemplates?: WhatsAppTemplate[];
    phone: string;
    location: string;
    receiptType?: 'thermal' | 'a4';
    receiptLogoThermal?: string;
    receiptA4Design?: string;
    screensaverEnabled?: boolean;
    screensaverTimeout?: number;
    socials: {
      facebook: string;
      instagram: string;
      twitter: string;
    };
  } | null;
  signOutUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refreshClubSettings: () => Promise<void>;
  refreshSetupStatus: () => Promise<void>;
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
  if (roleId === 'admin') return ['*'];
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
  const [setupRequired, setSetupRequired] = useState(false);
  const [clubSettings, setClubSettings] = useState<AuthContextValue['clubSettings']>(null);

  const fetchClubSettings = async () => {
    try {
      const docRef = doc(db, "settings", "general");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const templates = normalizeWhatsAppTemplates(
          data.whatsappTemplates,
          data.whatsappTemplate,
        );
        setClubSettings({
          name: data.name || "Club Manager",
          logoUrl: data.logoUrl || "/logo_dark_icon.svg",
          logoUrlLight: data.logoUrlLight || "",
          logoUrlDark: data.logoUrlDark || "",
          managerEmail: data.managerEmail || "",
          whatsappTemplate: data.whatsappTemplate || "",
          whatsappTemplates: templates,
          phone: data.phone || "",
          location: data.location || "",
          receiptType: data.receiptType || 'thermal',
          receiptLogoThermal: data.receiptLogoThermal || "",
          receiptA4Design: data.receiptA4Design || "",
          screensaverEnabled: data.screensaverEnabled ?? false,
          screensaverTimeout: data.screensaverTimeout ?? 60,
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
          managerEmail: "",
          whatsappTemplate: "", // Add this
          whatsappTemplates: [],
          phone: "",
          location: "",
          socials: { facebook: "", instagram: "", twitter: "" }
        });
      }
    } catch (error) {
      console.error("Error fetching club settings:", error);
    }
  };

  const checkSetupStatus = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "admin"), limit(1));
      const snap = await getDocs(q);
      setSetupRequired(snap.empty);
    } catch (error) {
      console.error("Error checking setup status:", error);
      // Fallback to localStorage if Firestore check fails (e.g. permission denied)
      setSetupRequired(localStorage.getItem("system_setup_complete") !== "true");
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchClubSettings(),
        checkSetupStatus()
      ]);

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

          if (!userRole && authUser.email) {
            const q = query(collection(db, "user_invites"), where("email", "==", authUser.email));
            const inviteSnap = await getDocs(q);
            if (!inviteSnap.empty) {
              const inviteDoc = inviteSnap.docs[0];
              const inviteData = inviteDoc.data();
              userRole = inviteData.role;
              userDisplayName = inviteData.name;
              await deleteDoc(doc(db, "user_invites", inviteDoc.id));
            }
          }

          if (!userRole) {
            const localAdminEmail =
              typeof window !== "undefined"
                ? localStorage.getItem("system_setup_admin_email")
                : null;
            if (localAdminEmail && authUser.email && localAdminEmail === authUser.email) {
              userRole = "admin";
              if (!userDisplayName) userDisplayName = "Admin";
              if (typeof window !== "undefined") {
                localStorage.removeItem("system_setup_admin_email");
              }
            }
          }

          if (!userRole) {
            const managerEmail = await (async () => {
              try {
                const settingsSnap = await getDoc(doc(db, "settings", "general"));
                if (!settingsSnap.exists()) return null;
                return settingsSnap.data().managerEmail || null;
              } catch {
                return null;
              }
            })();

            if (managerEmail && authUser.email && managerEmail === authUser.email) {
              userRole = "admin";
              if (!userDisplayName) userDisplayName = "Admin";
            } else {
              try {
                const adminSnap = await getDocs(
                  query(collection(db, "users"), where("role", "==", "admin"), limit(1))
                );
                if (adminSnap.empty) {
                  userRole = "admin";
                  if (!userDisplayName) userDisplayName = "Admin";
                }
              } catch {
                // Ignore bootstrap role errors
              }
            }
          }

          await setDoc(doc(db, "users", authUser.uid), {
            email: authUser.email,
            displayName: userDisplayName || authUser.displayName,
            photoURL: authUser.photoURL,
            lastLogin: new Date().toISOString(),
            role: userRole || "staff"
          }, { merge: true });

          userRole = userRole || "staff";
          setRole(userRole);
          const perms = await fetchRolePermissions(userRole);
          setPermissions(perms);

        } catch (error) {
          console.error("Auth error:", error);
          setRole("staff");
          setPermissions([]);
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    const unsubscribePromise = init();

    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, []);

  const signOutUser = async () => {
    await signOut(auth);
  };

  const hasPermission = (permission: string) => {
    if (!role) return false;
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  const value = useMemo(
    () => ({
      user,
      role,
      permissions,
      loading,
      setupRequired,
      clubSettings,
      signOutUser,
      hasPermission,
      refreshClubSettings: fetchClubSettings,
      refreshSetupStatus: checkSetupStatus,
    }),
    [user, role, permissions, loading, setupRequired, clubSettings]
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
