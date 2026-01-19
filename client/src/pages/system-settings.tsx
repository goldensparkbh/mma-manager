import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { updatePassword, updateEmail } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Settings, UserCog, Building2, Save, ImageIcon, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getSubscriptionPackages } from "@/lib/firebaseData";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SubscriptionPackage } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { useRef } from "react";

export default function SystemSettings() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
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
        instagram: "",
        twitter: "",
        whatsappTemplate: "", // Add this
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
                    instagram: data.socials?.instagram || "",
                    twitter: data.socials?.twitter || "",
                    whatsappTemplate: data.whatsappTemplate || "", // Add this
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
                },
                whatsappTemplate: clubProfile.whatsappTemplate, // Add this
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

    const insertVariable = (variable: string) => {
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            const text = clubProfile.whatsappTemplate;
            const before = text.substring(0, start);
            const after = text.substring(end, text.length);
            const newText = before + variable + after;

            setClubProfile({ ...clubProfile, whatsappTemplate: newText });

            // Restore cursor position after insert (React re-render might lose it, need setTimeout)
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + variable.length;
                    textareaRef.current.focus();
                }
            }, 0);
        }
    };

    const variables = [
        { label: "الأسم", value: "{name}" },
        { label: "رقم العضوية", value: "{memberId}" },
        { label: "الهاتف", value: "{phone}" },
        { label: "بداية الاشتراك", value: "{startDate}" },
        { label: "نهاية الاشتراك", value: "{endDate}" },
        { label: "الرصيد", value: "{balance}" },
        { label: "الحالة", value: "{status}" },
    ];

    return (
        <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
            <div className="flex items-center gap-4">
                <Settings className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">إعدادات النظام</h1>
                    <p className="text-muted-foreground">تكوين المنصة وبيانات النادي</p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                    <TabsTrigger value="profile">الهوية وبيانات التواصل</TabsTrigger>
                    <TabsTrigger value="packages">الباقات والاشتراكات</TabsTrigger>
                    <TabsTrigger value="admin">بيانات المدير</TabsTrigger>
                </TabsList>

                {/* Packages Tab */}
                <TabsContent value="packages" className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>باقات الاشتراكات</CardTitle>
                                <CardDescription>إدارة باقات الاشتراك المتاحة للأعضاء</CardDescription>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="w-4 h-4 ml-2" />
                                        باقة جديدة
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>إضافة باقة جديدة</DialogTitle>
                                    </DialogHeader>
                                    <AddPackageForm />
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <PackagesTable />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Club Profile Tab */}
                <TabsContent value="profile" className="space-y-6">
                    {/* Identity Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>هوية النادي</CardTitle>
                            <CardDescription>الاسم والشعارات الخاصة بالنادي</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>اسم النادي</Label>
                                <Input value={clubProfile.name} onChange={e => setClubProfile({ ...clubProfile, name: e.target.value })} placeholder="نادي الأبطال" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>بيانات التواصل</CardTitle>
                            <CardDescription>معلومات الاتصال والعنوان</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>رقم الهاتف</Label>
                                    <Input value={clubProfile.phone} onChange={e => setClubProfile({ ...clubProfile, phone: e.target.value })} placeholder="+973..." />
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
                                        <Label>Instagram URL</Label>
                                        <Input value={clubProfile.socialLinks?.instagram || ''} onChange={e => setClubProfile({ ...clubProfile, socialLinks: { ...clubProfile.socialLinks, instagram: e.target.value } })} placeholder="https://instagram.com/..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Facebook URL</Label>
                                        <Input value={clubProfile.socialLinks?.facebook || ''} onChange={e => setClubProfile({ ...clubProfile, socialLinks: { ...clubProfile.socialLinks, facebook: e.target.value } })} placeholder="https://facebook.com/..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Website URL</Label>
                                        <Input value={clubProfile.socialLinks?.website || ''} onChange={e => setClubProfile({ ...clubProfile, socialLinks: { ...clubProfile.socialLinks, website: e.target.value } })} placeholder="https://..." />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Automation Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>أتمتة الرسائل</CardTitle>
                            <CardDescription>إعداد قوالب الرسائل التلقائية (WhatsApp)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <Label>قالب تذكير الاشتراك (واتساب)</Label>
                                <Textarea
                                    ref={textareaRef}
                                    value={clubProfile.whatsappTemplate}
                                    onChange={e => setClubProfile({ ...clubProfile, whatsappTemplate: e.target.value })}
                                    placeholder="مرحباً {name}، نود تذكيرك بأن اشتراكك سينتهي بتاريخ {endDate}..."
                                    className="min-h-[100px] font-mono text-sm leading-relaxed"
                                    dir="auto"
                                />
                                <div className="space-y-3 p-4 bg-muted/20 rounded-lg border">
                                    <Label className="text-xs font-medium text-muted-foreground">المتغيرات المتاحة (اضغط للإدراج):</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {variables.map(v => (
                                            <Badge
                                                key={v.value}
                                                variant="outline"
                                                className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-all select-none px-3 py-1"
                                                onClick={() => insertVariable(v.value)}
                                                title={`إدراج ${v.label}`}
                                            >
                                                {v.label}
                                                <span className="mr-2 text-[10px] opacity-50 font-mono tracking-tighter" dir="ltr">{v.value}</span>
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        سيقوم النظام باستبدال هذه الرموز بالبيانات الحقيقية للعضو عند إرسال الرسالة.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Button onClick={handleSaveProfile} disabled={loading} className="w-full md:w-auto mt-4">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                        حفظ التغييرات
                    </Button>
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
                                <Input value={credForm.email} onChange={e => setCredForm({ ...credForm, email: e.target.value })} />
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
        </div >
    );
}

function PackagesTable() {
    const { data: packages, isLoading } = useQuery({
        queryKey: ["/api/packages"],
        queryFn: getSubscriptionPackages
    });

    const deletePackage = useMutation({
        mutationFn: async (id: string) => {
            const res = await apiRequest("DELETE", `/api/packages/${id}`);
            if (!res.ok) throw new Error("Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
        }
    });

    if (isLoading) return <div className="text-center py-4">جاري التحميل...</div>;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-right">اسم الباقة</TableHead>
                    <TableHead className="text-right">المدة (أيام)</TableHead>
                    <TableHead className="text-right">السعر (د.ب)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {packages?.map((pkg) => (
                    <TableRow key={pkg.id}>
                        <TableCell className="font-medium">{pkg.name}</TableCell>
                        <TableCell>{pkg.duration} يوم</TableCell>
                        <TableCell>{pkg.price} د.ب</TableCell>
                        <TableCell>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                                onClick={() => {
                                    if (confirm("هل أنت متأكد من حذف هذه الباقة؟")) {
                                        deletePackage.mutate(pkg.id);
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
                {(!packages || packages.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            لا توجد باقات مضافة
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

function AddPackageForm() {
    const [name, setName] = useState("");
    const [duration, setDuration] = useState("30");
    const [price, setPrice] = useState("");
    const { toast } = useToast();

    const createPackage = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/packages", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
            toast({ title: "تم الإضافة", description: "تمت إضافة الباقة بنجاح" });
            setName("");
            setPrice("");
        },
        onError: () => {
            toast({ variant: "destructive", title: "خطأ", description: "فشل إضافة الباقة" });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createPackage.mutate({
            name,
            duration: parseInt(duration),
            price: parseFloat(price) || 0
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>اسم الباقة</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: اشتراك شهري" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>المدة (بالأيام)</Label>
                    <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label>السعر</Label>
                    <Input type="number" step="0.5" value={price} onChange={e => setPrice(e.target.value)} required />
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={createPackage.isPending}>
                    {createPackage.isPending ? "جاري الإضافة..." : "حفظ الباقة"}
                </Button>
            </DialogFooter>
        </form>
    );
}

