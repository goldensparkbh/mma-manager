import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { updatePassword, updateEmail } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Settings, UserCog, Building2, Save, ImageIcon, Loader2 } from "lucide-react";

export default function SystemSettings() {
    const { user, refreshClubSettings } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [logoFileLight, setLogoFileLight] = useState<File | null>(null);
    const [logoFileDark, setLogoFileDark] = useState<File | null>(null);

    // Form states
    const [clubProfile, setClubProfile] = useState({
        name: "",
        logoUrlLight: "",
        logoUrlDark: "",
        phone: "",
        location: "",
        facebook: "",
        instagram: "",
        twitter: "",
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
                    logoUrlLight: data.logoUrlLight || data.logoUrl || "",
                    logoUrlDark: data.logoUrlDark || "",
                    phone: data.phone || "",
                    location: data.location || "",
                    facebook: data.socials?.facebook || "",
                    instagram: data.socials?.instagram || "",
                    twitter: data.socials?.twitter || "",
                });
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            let finalLogoUrlLight = clubProfile.logoUrlLight;
            let finalLogoUrlDark = clubProfile.logoUrlDark;

            if (logoFileLight) {
                const logoRef = ref(storage, "club/logo_light");
                await uploadBytes(logoRef, logoFileLight);
                finalLogoUrlLight = await getDownloadURL(logoRef);
            }

            if (logoFileDark) {
                const logoRef = ref(storage, "club/logo_dark");
                await uploadBytes(logoRef, logoFileDark);
                finalLogoUrlDark = await getDownloadURL(logoRef);
            }

            await setDoc(doc(db, "settings", "general"), {
                name: clubProfile.name,
                logoUrlLight: finalLogoUrlLight,
                logoUrlDark: finalLogoUrlDark,
                logoUrl: finalLogoUrlLight, // Backward compatibility
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

    const handleUpdateCredentials = async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (credForm.email !== user.email) {
                await updateEmail(user, credForm.email);

                // Sync with Firestore
                await updateDoc(doc(db, "users", user.uid), {
                    email: credForm.email
                });

                // Update managerEmail reference in settings
                await updateDoc(doc(db, "settings", "general"), {
                    managerEmail: credForm.email
                });

                toast({ title: "تم تحديث البريد", description: "تم تحديث البريد الإلكتروني بنجاح" });
            }
            if (credForm.newPassword) {
                if (credForm.newPassword !== credForm.confirmPassword) {
                    throw new Error("كلمات المرور غير متطابقة");
                }
                await updatePassword(user, credForm.newPassword);
                setCredForm(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
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
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="profile">الهوية وبيانات التواصل</TabsTrigger>
                    <TabsTrigger value="admin">بيانات المدير</TabsTrigger>
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
                                <div className="space-y-2 md:col-span-2">
                                    <Label>اسم النادي</Label>
                                    <Input value={clubProfile.name} onChange={e => setClubProfile({ ...clubProfile, name: e.target.value })} placeholder="نادي الأبطال" />
                                </div>

                                <div className="space-y-2">
                                    <Label>شعار النادي (النسخة الفاتحة - Light)</Label>
                                    <div className="flex items-center gap-4 border p-3 rounded-lg bg-muted/5">
                                        <div className="w-16 h-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                                            {logoFileLight ? (
                                                <img src={URL.createObjectURL(logoFileLight)} className="w-full h-full object-contain p-1" />
                                            ) : clubProfile.logoUrlLight ? (
                                                <img src={clubProfile.logoUrlLight} className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setLogoFileLight(e.target.files?.[0] || null)}
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1">يظهر على الخلفيات الداكنة</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>شعار النادي (النسخة المظلمة - Dark)</Label>
                                    <div className="flex items-center gap-4 border p-3 rounded-lg bg-muted/5">
                                        <div className="w-16 h-16 rounded-lg border bg-slate-900 flex items-center justify-center overflow-hidden">
                                            {logoFileDark ? (
                                                <img src={URL.createObjectURL(logoFileDark)} className="w-full h-full object-contain p-1" />
                                            ) : clubProfile.logoUrlDark ? (
                                                <img src={clubProfile.logoUrlDark} className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-slate-600" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setLogoFileDark(e.target.files?.[0] || null)}
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1">يظهر على الخلفيات الفاتحة</p>
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
                                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                                حفظ التغييرات
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
                                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                تحديث البيانات
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
