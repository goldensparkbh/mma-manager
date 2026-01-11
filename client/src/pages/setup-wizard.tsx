import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth, updateProfile, signOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Database, Building2, UserPlus, CheckCircle2, ArrowRight, ArrowLeft, Loader2, ImageIcon } from "lucide-react";
import { useLocation } from "wouter";

export default function SetupWizard() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Persistence: Check if we are resuming after a reload (Step 1 complete)
    useEffect(() => {
        const isConfigured = localStorage.getItem("firebase_custom_config");
        if (isConfigured && !localStorage.getItem("system_setup_complete")) {
            // If we have config but not complete, start at step 2
            setStep(2);
        }
    }, []);

    // Step 1: Firebase Config
    const [firebaseConfig, setFirebaseConfig] = useState({
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: "",
    });

    // Step 2: Club Details
    const [clubProfile, setClubProfile] = useState({
        name: "",
        phone: "",
        location: "",
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);

    // Step 3: Admin Account
    const [adminData, setAdminData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleStep1Connect = () => {
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
            toast({ variant: "destructive", title: "خطأ", description: "يرجى ملء جميع حقول الاتصال الأساسية" });
            return;
        }
        localStorage.setItem("firebase_custom_config", JSON.stringify(firebaseConfig));
        toast({ title: "تم حفظ الإعدادات", description: "سيتم إعادة تحميل الصفحة لبدء الاتصال..." });
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    const handleStep2Save = async () => {
        if (!clubProfile.name) {
            toast({ variant: "destructive", title: "خطأ", description: "اسم النادي مطلوب" });
            return;
        }
        setLoading(true);
        try {
            let logoUrl = "";
            if (logoFile) {
                try {
                    const logoRef = ref(storage, "club/logo");
                    await uploadBytes(logoRef, logoFile);
                    logoUrl = await getDownloadURL(logoRef);
                } catch (uploadError: any) {
                    console.error("Logo upload failed:", uploadError);
                    const isCors = uploadError.message?.includes("CORS") || uploadError.code === "storage/retry-limit-exceeded";

                    toast({
                        variant: "destructive",
                        title: "فشل رفع الشعار",
                        description: isCors
                            ? "خطأ في سياسة CORS. يرجى مراجعة ملف firebase-cors.json في المجلد الرئيسي واتباع التعليمات."
                            : "فشل رفع الصورة. يمكنك المتابعة بدون شعار حالياً وتغييره لاحقاً."
                    });

                    // If the user wants to continue despite the logo error
                    if (!confirm("فشل رفع الشعار. هل تريد المتابعة بدون شعار؟ (يمكنك إضافته لاحقاً من الإعدادات)")) {
                        setLoading(false);
                        return;
                    }
                }
            }

            await setDoc(doc(db, "settings", "general"), {
                ...clubProfile,
                logoUrl,
                socials: { facebook: "", instagram: "", twitter: "" }
            }, { merge: true });

            setStep(3);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "خطأ في الحفظ",
                description: "تعذر حفظ البيانات في Firestore. تأكد من أن قواعد البيانات (Rules) تسمح بالكتابة. " + error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleStep3Finish = async () => {
        if (adminData.password !== adminData.confirmPassword) {
            toast({ variant: "destructive", title: "خطأ", description: "كلمات المرور غير متطابقة" });
            return;
        }
        setLoading(true);
        try {
            const auth = getAuth();
            const userCred = await createUserWithEmailAndPassword(auth, adminData.email, adminData.password);
            await updateProfile(userCred.user, { displayName: adminData.name });

            // Store in users collection
            await setDoc(doc(db, "users", userCred.user.uid), {
                email: adminData.email,
                displayName: adminData.name,
                role: "admin",
                createdAt: new Date().toISOString()
            });

            localStorage.setItem("system_setup_complete", "true");
            await signOut(auth); // Sign out so they can log in via the login page

            toast({ title: "تم الإعداد بنجاح!", description: "يمكنك الآن تسجيل الدخول بحساب المدير" });
            setLocation("/login");
        } catch (error: any) {
            toast({ variant: "destructive", title: "خطأ", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <div className="flex justify-between mb-8 max-w-sm mx-auto relative px-4 text-sm sm:text-base">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -z-10 -translate-y-1/2"></div>
            {[1, 2, 3].map((s) => (
                <div
                    key={s}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all ${step >= s ? "bg-primary border-primary text-white shadow-lg" : "bg-background border-muted text-muted-foreground"
                        }`}
                >
                    {step > s ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : s}
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black mb-2">إعداد المنصة لأول مرة</h1>
                    <p className="text-muted-foreground">لنقم بضبط النظام الخاص بناديك في خطوات بسيطة</p>
                </div>

                {renderStepIndicator()}

                <Card className="shadow-xl border-none">
                    {step === 1 && (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="w-5 h-5 text-primary" />
                                    الخطوة 1: ربط قاعدة البيانات (Firebase)
                                </CardTitle>
                                <CardDescription>أدخل مفاتيح API الخاصة بمشروع Firebase الخاص بك</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4" dir="ltr">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                    <div className="space-y-2">
                                        <Label>API Key</Label>
                                        <Input value={firebaseConfig.apiKey} onChange={e => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })} placeholder="AIza..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Project ID</Label>
                                        <Input value={firebaseConfig.projectId} onChange={e => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })} placeholder="my-club-123" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>App ID</Label>
                                        <Input value={firebaseConfig.appId} onChange={e => setFirebaseConfig({ ...firebaseConfig, appId: e.target.value })} placeholder="1:123456..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Auth Domain (Optional)</Label>
                                        <Input value={firebaseConfig.authDomain} onChange={e => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value })} />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <Button onClick={handleStep1Connect}>
                                        ربط ومتابعة
                                        <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-primary" />
                                    الخطوة 2: هوية النادي
                                </CardTitle>
                                <CardDescription>أدخل الاسم والشعار الذي سيظهر في المنصة والبطاقات</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>اسم النادي</Label>
                                    <Input value={clubProfile.name} onChange={e => setClubProfile({ ...clubProfile, name: e.target.value })} placeholder="مثال: نادي أبطال الخليج" />
                                </div>
                                <div className="space-y-2">
                                    <Label>شعار النادي</Label>
                                    <div className="flex flex-col sm:flex-row items-center gap-4 border p-4 rounded-lg bg-muted/10">
                                        <div className="w-16 h-16 rounded border bg-background flex-shrink-0 flex items-center justify-center overflow-hidden">
                                            {logoFile ? <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-muted" />}
                                        </div>
                                        <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="cursor-pointer" />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-between">
                                    <Button variant="ghost" onClick={() => { localStorage.removeItem("firebase_custom_config"); window.location.reload(); }}>
                                        تغيير الاتصال
                                    </Button>
                                    <Button onClick={handleStep2Save} disabled={loading}>
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                        حفظ ومتابعة
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-primary" />
                                    الخطوة 3: حساب المدير
                                </CardTitle>
                                <CardDescription>أنشئ أول حساب مدير للتحكم في المنصة</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>اسم المدير</Label>
                                    <Input value={adminData.name} onChange={e => setAdminData({ ...adminData, name: e.target.value })} placeholder="الاسم الكامل" />
                                </div>
                                <div className="space-y-2">
                                    <Label>البريد الإلكتروني</Label>
                                    <Input dir="ltr" value={adminData.email} onChange={e => setAdminData({ ...adminData, email: e.target.value })} placeholder="manager@example.com" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>كلمة المرور</Label>
                                        <Input type="password" value={adminData.password} onChange={e => setAdminData({ ...adminData, password: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>تأكيد كلمة المرور</Label>
                                        <Input type="password" value={adminData.confirmPassword} onChange={e => setAdminData({ ...adminData, confirmPassword: e.target.value })} />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <Button onClick={handleStep3Finish} disabled={loading} className="w-full h-12 text-lg">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                        إكمال الإعداد وتشغيل المنصة
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}
