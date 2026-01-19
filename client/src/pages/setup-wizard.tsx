import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth, updateProfile } from "firebase/auth";
import { UserPlus, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";

export default function SetupWizard() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [loading, setLoading] = useState(false);

    // Admin Account
    const [adminData, setAdminData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
    });

    const { refreshSetupStatus } = useAuth();

    const handleFinish = async () => {
        if (!adminData.email || !adminData.password) {
            toast({ variant: "destructive", title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة" });
            return;
        }

        if (adminData.password !== adminData.confirmPassword) {
            toast({ variant: "destructive", title: "خطأ", description: "كلمات المرور غير متطابقة" });
            return;
        }

        if (adminData.password.length < 6) {
            toast({ variant: "destructive", title: "خطأ", description: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" });
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

            // Save manager email as the primary admin reference
            await setDoc(doc(db, "settings", "general"), {
                managerEmail: adminData.email
            }, { merge: true });

            localStorage.setItem("system_setup_complete", "true");

            // Refresh setup status in context so the wizard disappears
            await refreshSetupStatus();

            toast({ title: "تم الإعداد بنجاح!", description: "تم إنشاء حساب المدير وتحويلك للوحة التحكم" });
            setLocation("/system-settings");
        } catch (error: any) {
            toast({ variant: "destructive", title: "خطأ", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black mb-2">إعداد المنصة لأول مرة</h1>
                    <p className="text-muted-foreground">أنشئ حساب المدير للبدء في استخدام النظام</p>
                </div>

                <Card className="shadow-xl border-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            إنشاء حساب المدير
                        </CardTitle>
                        <CardDescription>أدخل البريد الإلكتروني وكلمة المرور للمدير</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>البريد الإلكتروني</Label>
                            <Input
                                value={adminData.email}
                                onChange={e => setAdminData({ ...adminData, email: e.target.value })}
                                placeholder="manager@example.com"
                                type="email"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>كلمة المرور</Label>
                                <Input
                                    type="password"
                                    value={adminData.password}
                                    onChange={e => setAdminData({ ...adminData, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>تأكيد كلمة المرور</Label>
                                <Input
                                    type="password"
                                    value={adminData.confirmPassword}
                                    onChange={e => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <div className="pt-4">
                            <Button onClick={handleFinish} disabled={loading} className="w-full h-12 text-lg">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                إكمال الإعداد والتحويل لصفحة الدخول
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
