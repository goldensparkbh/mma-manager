import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth, updateProfile } from "firebase/auth";
import { UserPlus, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";

export default function SetupWizard() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [loading, setLoading] = useState(false);
    const { t, dir } = useLanguage();

    // Admin Account
    const [adminData, setAdminData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
    });

    const { refreshSetupStatus } = useAuth();

    const handleFinish = async () => {
        if (!adminData.email || !adminData.password) {
            toast({ variant: "destructive", title: t("common.error"), description: t("setup.errors.requiredFields") });
            return;
        }

        if (adminData.password !== adminData.confirmPassword) {
            toast({ variant: "destructive", title: t("common.error"), description: t("setup.errors.passwordMismatch") });
            return;
        }

        if (adminData.password.length < 6) {
            toast({ variant: "destructive", title: t("common.error"), description: t("setup.errors.passwordLength") });
            return;
        }

        setLoading(true);
        try {
            const auth = getAuth();
            const userCred = await createUserWithEmailAndPassword(auth, adminData.email, adminData.password);
            await updateProfile(userCred.user, { displayName: "Admin" });

            // Store in users collection
            await setDoc(doc(db, "users", userCred.user.uid), {
                email: adminData.email,
                displayName: "Admin",
                role: "admin",
                createdAt: new Date().toISOString()
            });

            // Ensure only the admin user exists on first run
            const usersSnap = await getDocs(collection(db, "users"));
            await Promise.all(
                usersSnap.docs
                    .filter((docSnap) => docSnap.id !== userCred.user.uid)
                    .map((docSnap) => deleteDoc(docSnap.ref))
            );

            // Persist for immediate role hydration after auth state change
            localStorage.setItem("system_setup_admin_email", adminData.email);

            // Save manager email as the primary admin reference
            await setDoc(doc(db, "settings", "general"), {
                managerEmail: adminData.email
            }, { merge: true });

            localStorage.setItem("system_setup_complete", "true");

            // Refresh setup status in context so the wizard disappears
            await refreshSetupStatus();

            toast({ title: t("setup.successTitle"), description: t("setup.successDescription") });
            setLocation("/");
        } catch (error: any) {
            toast({ variant: "destructive", title: t("common.error"), description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4" dir={dir}>
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black mb-2">{t("setup.title")}</h1>
                    <p className="text-muted-foreground">{t("setup.subtitle")}</p>
                </div>

                <Card className="shadow-xl border-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            {t("setup.cardTitle")}
                        </CardTitle>
                        <CardDescription>{t("setup.cardDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("setup.emailLabel")}</Label>
                            <Input
                                value={adminData.email}
                                onChange={e => setAdminData({ ...adminData, email: e.target.value })}
                                placeholder={t("setup.emailPlaceholder")}
                                type="email"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("setup.passwordLabel")}</Label>
                                <Input
                                    type="password"
                                    value={adminData.password}
                                    onChange={e => setAdminData({ ...adminData, password: e.target.value })}
                                    placeholder={t("setup.passwordPlaceholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("setup.confirmPasswordLabel")}</Label>
                                <Input
                                    type="password"
                                    value={adminData.confirmPassword}
                                    onChange={e => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                                    placeholder={t("setup.passwordPlaceholder")}
                                />
                            </div>
                        </div>
                        <div className="pt-4">
                            <Button onClick={handleFinish} disabled={loading} className="w-full h-12 text-lg">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                {t("setup.finishButton")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
