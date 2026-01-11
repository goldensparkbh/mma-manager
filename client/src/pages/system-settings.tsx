import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updatePassword, updateEmail } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Settings, Database, UserCog, Building2, Save, Upload, ImageIcon } from "lucide-react";

export default function SystemSettings() {
    const { user, refreshClubSettings } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    // Form states
    const [clubProfile, setClubProfile] = useState({
        name: "",
        logoUrl: "",
        phone: "",
        location: "",
        facebook: "",
        instagram: "",
        twitter: "",
    });

    const [firebaseConfig, setFirebaseConfig] = useState({
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: "",
    });

    const [credForm, setCredForm] = useState({
        email: user?.email || "",
        newPassword: "",
        confirmPassword: "",
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const docRef = doc(db, "settings", "general");
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                setClubProfile({
                    name: data.name || "",
                    logoUrl: data.logoUrl || "",
                    phone: data.phone || "",
                    location: data.location || "",
                    facebook: data.socials?.facebook || "",
                    instagram: data.socials?.instagram || "",
                    twitter: data.socials?.twitter || "",
                });
            }

            // Load local config if exists, otherwise fallback to env (masked)
            const storedConfig = localStorage.getItem("firebase_custom_config");
            if (storedConfig) {
                setFirebaseConfig(JSON.parse(storedConfig));
            } else {
                setFirebaseConfig({
                    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "****************",
                    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
                    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
                    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
                    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
                    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
                });
            }

        } catch (error) {
            console.error("Failed to fetch settings", error);
        }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            let finalLogoUrl = clubProfile.logoUrl;

            if (logoFile) {
                const logoRef = ref(storage, "club/logo");
                await uploadBytes(logoRef, logoFile);
                finalLogoUrl = await getDownloadURL(logoRef);
            }

            await setDoc(doc(db, "settings", "general"), {
                name: clubProfile.name,
                logoUrl: finalLogoUrl,
                phone: clubProfile.phone,
                location: clubProfile.location,
                socials: {
                    facebook: clubProfile.facebook,
                    instagram: clubProfile.instagram,
                    twitter: clubProfile.twitter
                }
            }, { merge: true });

            await refreshClubSettings();
            toast({ title: "تم الحفظ", description: "تم تحديث بيانات النادي بنجاح" });
        } catch (error) {
            toast({ variant: "destructive", title: "خطأ", description: "فشل حفظ البيانات" });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = () => {
        // Logic to save config to localStorage or trigger a re-init
        // Warning the user that this requires reload
        if (confirm("تغيير إعدادات الاتصال يتطلب إعادة تحميل الصفحة. هل أنت متأكد؟")) {
            localStorage.setItem("firebase_custom_config", JSON.stringify(firebaseConfig));
            window.location.reload();
        }
    };

    const handleUpdateCredentials = async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (credForm.email !== user.email) {
                await updateEmail(user, credForm.email);
                toast({ title: "تم تحديث البريد", description: "يرجى التحقق من بريدك الجديد" });
            }
            if (credForm.newPassword) {
                if (credForm.newPassword !== credForm.confirmPassword) {
                    throw new Error("كلمات المرور غير متطابقة");
                }
                await updatePassword(user, credForm.newPassword);
                toast({ title: "تم تحديث كلمة المرور", description: "استخدم كلمة المرور الجديدة في المرة القادمة" });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "خطأ", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Settings className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">إعدادات النظام</h1>
                    <p className="text-muted-foreground">تكوين المنصة وبيانات النادي</p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                    <TabsTrigger value="profile">بيانات النادي</TabsTrigger>
                    <TabsTrigger value="database">اتصال قاعدة البيانات</TabsTrigger>
                    <TabsTrigger value="admin">حساب المدير</TabsTrigger>
                </TabsList>

                {/* Club Profile Tab */}
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>الهوية وبيانات التواصل</CardTitle>
                            <CardDescription>تخصيص شعار واسم النادي ومعلومات التواصل</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>اسم النادي</Label>
                                    <Input value={clubProfile.name} onChange={e => setClubProfile({ ...clubProfile, name: e.target.value })} placeholder="نادي الأبطال" />
                                </div>
                                <div className="space-y-2">
                                    <Label>شعار النادي</Label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                                            {logoFile ? (
                                                <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-cover" />
                                            ) : clubProfile.logoUrl ? (
                                                <img src={clubProfile.logoUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setLogoFile(e.target.files?.[0] || null)}
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1">يُفضل استخدام صورة مربعة بخلفية شفافة</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>رقم الهاتف</Label>
                                    <Input value={clubProfile.phone} onChange={e => setClubProfile({ ...clubProfile, phone: e.target.value })} placeholder="+973..." dir="ltr" />
                                </div>
                                <div className="space-y-2">
                                    <Label>الموقع / العنوان</Label>
                                    <Input value={clubProfile.location} onChange={e => setClubProfile({ ...clubProfile, location: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t">
                                <h3 className="font-medium text-sm">روابط التواصل الاجتماعي</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Instagram</Label>
                                        <Input value={clubProfile.instagram} onChange={e => setClubProfile({ ...clubProfile, instagram: e.target.value })} placeholder="@username" dir="ltr" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Facebook</Label>
                                        <Input value={clubProfile.facebook} onChange={e => setClubProfile({ ...clubProfile, facebook: e.target.value })} placeholder="page name" dir="ltr" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Twitter / X</Label>
                                        <Input value={clubProfile.twitter} onChange={e => setClubProfile({ ...clubProfile, twitter: e.target.value })} placeholder="@handle" dir="ltr" />
                                    </div>
                                </div>
                            </div>

                            <Button onClick={handleSaveProfile} disabled={loading} className="w-full md:w-auto mt-4">
                                <Save className="w-4 h-4 ml-2" />
                                حفظ التغييرات
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Database Config Tab */}
                <TabsContent value="database">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <Database className="w-5 h-5" />
                                إعدادات Firebase API
                            </CardTitle>
                            <CardDescription>
                                تنبيه: تغيير هذه الإعدادات سيقوم بربط المنصة بقاعدة بيانات مختلفة. تأكد من صحة البيانات.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="ltr">
                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <Input value={firebaseConfig.apiKey} onChange={e => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Auth Domain</Label>
                                    <Input value={firebaseConfig.authDomain} onChange={e => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Project ID</Label>
                                    <Input value={firebaseConfig.projectId} onChange={e => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Storage Bucket</Label>
                                    <Input value={firebaseConfig.storageBucket} onChange={e => setFirebaseConfig({ ...firebaseConfig, storageBucket: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Messaging Sender ID</Label>
                                    <Input value={firebaseConfig.messagingSenderId} onChange={e => setFirebaseConfig({ ...firebaseConfig, messagingSenderId: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>App ID</Label>
                                    <Input value={firebaseConfig.appId} onChange={e => setFirebaseConfig({ ...firebaseConfig, appId: e.target.value })} />
                                </div>
                            </div>
                            <Button variant="destructive" onClick={handleSaveConfig} className="w-full md:w-auto">
                                حفظ وإعادة التشغيل
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Admin Credentials Tab */}
                <TabsContent value="admin">
                    <Card>
                        <CardHeader>
                            <CardTitle>بيانات المدير</CardTitle>
                            <CardDescription>تحديث بيانات الدخول الخاصة بالمدير الحالي</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>البريد الإلكتروني</Label>
                                <Input value={credForm.email} onChange={e => setCredForm({ ...credForm, email: e.target.value })} dir="ltr" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>كلمة المرور الجديدة</Label>
                                    <Input type="password" value={credForm.newPassword} onChange={e => setCredForm({ ...credForm, newPassword: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>تأكيد كلمة المرور</Label>
                                    <Input type="password" value={credForm.confirmPassword} onChange={e => setCredForm({ ...credForm, confirmPassword: e.target.value })} />
                                </div>
                            </div>
                            <Button onClick={handleUpdateCredentials} disabled={loading}>
                                تحديث البيانات
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
