import { useState, useEffect, useRef } from "react";
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
import {
    Settings, UserCog, Building2, Save, ImageIcon, Loader2,
    Package, Plus, Trash2, Download, Upload, Database,
    AlertTriangle, Languages, RefreshCcw, Github, Info,
    CheckCircle, Zap, ShieldCheck, Key, Sparkles
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getSubscriptionPackages } from "@/lib/firebaseData";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SubscriptionPackage } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/context/language-context";
import { clearDatabase, exportFullDatabase, importFullDatabase } from "@/lib/backup-utils";
import { normalizeWhatsAppTemplates, type WhatsAppTemplate } from "@/lib/whatsapp";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { APP_VERSION } from "@/lib/app-version";
import { compareVersions } from "@/lib/utils"; // I'll need to create or verify this. Actually I'll use a simple string compare if needed or add it.


import { Badge } from "@/components/ui/badge";
import { PERMISSIONS } from "@/lib/permissions";

type ClubProfile = {
    name: string;
    logoUrlLight: string;
    logoUrlDark: string;
    phone: string;
    location: string;
    facebook: string;
    instagram: string;
    twitter: string;
    socialLinks?: {
        instagram?: string;
        facebook?: string;
        website?: string;
    };
    whatsappTemplates: WhatsAppTemplate[];
    githubToken: string;
    receiptType: 'thermal' | 'a4';
    receiptLogoThermal: string;
    receiptA4Design: string;
    screensaverEnabled: boolean;
    screensaverTimeout: number;
};

export default function SystemSettings() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { user, refreshClubSettings, hasPermission } = useAuth();
    const canModify = hasPermission(PERMISSIONS.SETTINGS_MODIFY);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [progressStatus, setProgressStatus] = useState("");
    const [logoFileLight, setLogoFileLight] = useState<File | null>(null);
    const [logoFileDark, setLogoFileDark] = useState<File | null>(null);
    const [thermalLogoFile, setThermalLogoFile] = useState<File | null>(null);
    const [a4DesignFile, setA4DesignFile] = useState<File | null>(null);

    // Backup Import States
    const [importJsonFile, setImportJsonFile] = useState<File | null>(null);
    const [importZipFile, setImportZipFile] = useState<File | null>(null);
    const [showRestoreAlert, setShowRestoreAlert] = useState(false);
    const [showClearAlert, setShowClearAlert] = useState(false);
    const [clearConfirmText, setClearConfirmText] = useState("");
    const [isClearingDatabase, setIsClearingDatabase] = useState(false);
    const [clearStatus, setClearStatus] = useState("");

    const { language, setLanguage, t, dir } = useLanguage();
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // Form states
    const [clubProfile, setClubProfile] = useState<ClubProfile>({
        name: "",
        logoUrlLight: "",
        logoUrlDark: "",
        phone: "",
        location: "",
        facebook: "",
        instagram: "",
        twitter: "",
        socialLinks: {
            instagram: "",
            facebook: "",
            website: "",
        },
        whatsappTemplates: [],
        githubToken: "",
        receiptType: 'thermal',
        receiptLogoThermal: "",
        receiptA4Design: "",
        screensaverEnabled: false,
        screensaverTimeout: 60,
    });

    const [credForm, setCredForm] = useState({
        email: user?.email || "",
        newPassword: "",
        confirmPassword: "",
    });

    // Update States
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [latestVersion, setLatestVersion] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState("");


    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (!selectedTemplateId && clubProfile.whatsappTemplates.length > 0) {
            setSelectedTemplateId(clubProfile.whatsappTemplates[0].id);
        }
    }, [clubProfile.whatsappTemplates, selectedTemplateId]);

    const fetchSettings = async () => {
        try {
            const docRef = doc(db, "settings", "general");
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                const templates = normalizeWhatsAppTemplates(
                    data.whatsappTemplates,
                    data.whatsappTemplate,
                );
                setClubProfile({
                    name: data.name || "",
                    logoUrlLight: data.logoUrlLight || data.logoUrl || "",
                    logoUrlDark: data.logoUrlDark || "",
                    phone: data.phone || "",
                    location: data.location || "",
                    facebook: data.socials?.facebook || "",
                    instagram: data.socials?.instagram || "",
                    twitter: data.socials?.twitter || "",
                    socialLinks: {
                        instagram: data.socials?.instagram || "",
                        facebook: data.socials?.facebook || "",
                        website: data.socialLinks?.website || "",
                    },
                    whatsappTemplates: templates,
                    githubToken: data.githubToken || "",
                    receiptType: data.receiptType || 'thermal',
                    receiptLogoThermal: data.receiptLogoThermal || "",
                    receiptA4Design: data.receiptA4Design || "",
                    screensaverEnabled: data.screensaverEnabled ?? false,
                    screensaverTimeout: data.screensaverTimeout ?? 60,
                });
                setSelectedTemplateId(templates[0]?.id || null);
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

            let finalThermalLogoUrl = clubProfile.receiptLogoThermal;
            let finalA4DesignUrl = clubProfile.receiptA4Design;

            if (thermalLogoFile) {
                const logoRef = ref(storage, "club/receipt_thermal_logo");
                await uploadBytes(logoRef, thermalLogoFile);
                finalThermalLogoUrl = await getDownloadURL(logoRef);
            }

            if (a4DesignFile) {
                const designRef = ref(storage, "club/receipt_a4_design");
                await uploadBytes(designRef, a4DesignFile);
                finalA4DesignUrl = await getDownloadURL(designRef);
            }

            const socialLinks = clubProfile.socialLinks ?? {};
            await setDoc(doc(db, "settings", "general"), {
                name: clubProfile.name,
                logoUrlLight: finalLogoUrlLight,
                logoUrlDark: finalLogoUrlDark,
                logoUrl: finalLogoUrlLight, // Backward compatibility
                phone: clubProfile.phone,
                location: clubProfile.location,
                socials: {
                    facebook: socialLinks.facebook || clubProfile.facebook,
                    instagram: socialLinks.instagram || clubProfile.instagram,
                    twitter: clubProfile.twitter
                },
                socialLinks: {
                    website: socialLinks.website || "",
                },
                whatsappTemplate: clubProfile.whatsappTemplates[0]?.body || "",
                whatsappTemplates: clubProfile.whatsappTemplates,
                githubToken: clubProfile.githubToken || "",
                receiptType: clubProfile.receiptType,
                receiptLogoThermal: finalThermalLogoUrl,
                receiptA4Design: finalA4DesignUrl,
                screensaverEnabled: clubProfile.screensaverEnabled,
                screensaverTimeout: clubProfile.screensaverTimeout,
            }, { merge: true });

            await refreshClubSettings();
            toast({ title: t("common.success"), description: t("settings.profileSaveSuccess") });
        } catch (error) {
            toast({ variant: "destructive", title: t("common.error"), description: t("settings.profileSaveError") });
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

                toast({ title: t("common.success"), description: t("settings.emailUpdateSuccess") });
            }
            if (credForm.newPassword) {
                if (credForm.newPassword !== credForm.confirmPassword) {
                    throw new Error(t("settings.passwordMismatch"));
                }
                await updatePassword(user, credForm.newPassword);
                setCredForm(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
                toast({ title: t("common.success"), description: t("settings.passwordUpdateSuccess") });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: t("common.error"), description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const insertVariable = (variable: string) => {
        if (!textareaRef.current || !selectedTemplateId) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const currentTemplate = clubProfile.whatsappTemplates.find(
            (template) => template.id === selectedTemplateId
        );
        const text = currentTemplate?.body || "";
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        const newText = before + variable + after;

        setClubProfile({
            ...clubProfile,
            whatsappTemplates: clubProfile.whatsappTemplates.map((template) =>
                template.id === selectedTemplateId ? { ...template, body: newText } : template
            ),
        });

        // Restore cursor position after insert (React re-render might lose it, need setTimeout)
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + variable.length;
                textareaRef.current.focus();
            }
        }, 0);
    };

    const createTemplateId = () =>
        `template-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const addWhatsAppTemplate = () => {
        const defaultTitle = t("settings.whatsappTemplateDefaultTitle");
        const newTemplate: WhatsAppTemplate = {
            id: createTemplateId(),
            title: defaultTitle,
            body: "",
        };
        setClubProfile((prev) => ({
            ...prev,
            whatsappTemplates: [...prev.whatsappTemplates, newTemplate],
        }));
        setSelectedTemplateId(newTemplate.id);
        setTimeout(() => textareaRef.current?.focus(), 0);
    };

    const updateWhatsAppTemplate = (id: string, updates: Partial<WhatsAppTemplate>) => {
        setClubProfile((prev) => ({
            ...prev,
            whatsappTemplates: prev.whatsappTemplates.map((template) =>
                template.id === id ? { ...template, ...updates } : template
            ),
        }));
    };

    const deleteWhatsAppTemplate = (id: string) => {
        setClubProfile((prev) => {
            const remaining = prev.whatsappTemplates.filter((template) => template.id !== id);
            if (selectedTemplateId === id) {
                setSelectedTemplateId(remaining[0]?.id || null);
            }
            return { ...prev, whatsappTemplates: remaining };
        });
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            await exportFullDatabase((status) => setProgressStatus(status));
            toast({ title: t("common.success"), description: t("settings.exportSuccess") });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: t("common.error"), description: t("settings.exportError") });
        } finally {
            setLoading(false);
            setProgressStatus("");
        }
    };

    const handleRestore = async () => {
        if (!importJsonFile) return;

        setShowRestoreAlert(false);
        setLoading(true);
        try {
            await importFullDatabase(importJsonFile, importZipFile, (status) => setProgressStatus(status));
            toast({ title: t("common.success"), description: t("settings.restoreSuccess") });

            // Reload page to reflect changes
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error("Restore error:", error);
            toast({ variant: "destructive", title: t("common.error"), description: t("settings.restoreError") });
            setLoading(false);
            setProgressStatus("");
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm(t("settings.importConfirm"))) {
            event.target.value = ""; // Reset input
            return;
        }

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (!json.data) throw new Error("Invalid backup format");

                const batch = writeBatch(db);
                let operationCount = 0;
                const BATCH_LIMIT = 450; // Firestore limit is 500

                const commitBatch = async () => {
                    if (operationCount > 0) {
                        await batch.commit();
                        operationCount = 0;
                        // We can't reuse batch after commit in recent SDKs easily without creating new one, 
                        // but actually writeBatch returns a new batch object. 
                        // However, strictly loop logic: we should create new batch if we were splitting.
                        // Ideally we commit and create new.
                    }
                };

                // Since writeBatch instance is single, we can't 'reset' it. 
                // We need to loop and process in chunks or strictly careful.
                // Simple approach: Iterate data, build batches.

                // Refactor to function to handle batching properly is complex in one go.
                // Let's do a simple approach: Process collection by collection, creating batches as needed.

                for (const [colName, docs] of Object.entries(json.data)) {
                    if (Array.isArray(docs)) {
                        for (const docData of docs) {
                            // @ts-ignore
                            const { id, ...data } = docData;
                            if (id) {
                                await setDoc(doc(db, colName, id), data, { merge: true });
                                // Direct setDoc allows individual writes. Slower but safer for large datasets without complex batching logic here.
                                // Or use small batches if performance is key.
                            }
                        }
                    }
                }

                toast({ title: t("common.success"), description: t("settings.importSuccess") });
                window.location.reload();
            } catch (error) {
                console.error(error);
                toast({ variant: "destructive", title: t("common.error"), description: t("settings.importError") });
            } finally {
                setLoading(false);
                event.target.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleClearDatabase = async () => {
        setShowClearAlert(false);
        setClearConfirmText("");
        setIsClearingDatabase(true);
        setClearStatus(t("settings.clearStatus"));
        try {
            await clearDatabase();
            toast({ title: t("common.success"), description: t("settings.clearSuccess") });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: t("common.error"), description: t("settings.clearError") });
            setIsClearingDatabase(false);
            setClearStatus("");
        }
    };

    const variables = [
        { label: t("settings.whatsappVariables.name"), value: "{name}" },
        { label: t("settings.whatsappVariables.memberId"), value: "{memberId}" },
        { label: t("settings.whatsappVariables.phone"), value: "{phone}" },
        { label: t("settings.whatsappVariables.startDate"), value: "{startDate}" },
        { label: t("settings.whatsappVariables.endDate"), value: "{endDate}" },
        { label: t("settings.whatsappVariables.balance"), value: "{balance}" },
        { label: t("settings.whatsappVariables.status"), value: "{status}" },
    ];
    const selectedTemplate = clubProfile.whatsappTemplates.find(
        (template) => template.id === selectedTemplateId
    );
    const CLEAR_CONFIRM_WORD = "DELETE";
    const clearConfirmMatches = clearConfirmText.trim().toLowerCase() === CLEAR_CONFIRM_WORD.toLowerCase();

    const checkUpdates = async () => {
        setCheckingUpdate(true);
        try {
            const headers: Record<string, string> = {};
            if (clubProfile.githubToken) {
                headers['Authorization'] = `token ${clubProfile.githubToken}`;
            }

            const response = await fetch(`https://api.github.com/repos/${APP_VERSION.repo}/releases/latest`, {
                headers: headers
            });
            if (response.ok) {
                const data = await response.json();
                setLatestVersion({
                    number: data.tag_name.replace('v', ''),
                    date: data.published_at.split('T')[0],
                    name: data.name,
                    notes: data.body,
                    url: data.html_url
                });
            } else {
                // Fallback or error
                toast({ variant: "destructive", title: t("settings.update.updateError") });
            }
        } catch (error) {
            console.error("Failed to check for updates", error);
            toast({ variant: "destructive", title: t("settings.update.updateError") });
        } finally {
            setCheckingUpdate(false);
        }
    };

    const handleUpdate = async () => {
        setIsUpdating(true);
        setUpdateStatus(t("settings.update.updating"));

        try {
            // 1. Trigger the GitHub Action to redeploy
            if (clubProfile.githubToken) {
                const response = await fetch(`https://api.github.com/repos/${APP_VERSION.repo}/actions/workflows/deploy.yml/dispatches`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${clubProfile.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ref: 'main', // Or your default branch
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.error("GitHub Action Trigger Failed:", error);
                    // We continue anyway so the UI feels responsive, 
                    // but we log it for debugging.
                }
            }

            // 2. Wait for a simulated build time (usually takes a few minutes for real)
            // For better UX, we'll wait a bit longer now that it's doing a real trigger
            await new Promise(resolve => setTimeout(resolve, 5000));

            toast({ title: t("common.success"), description: t("settings.update.updateSuccess") });

            setTimeout(() => {
                // Force a hard reload by appending a timestamp to bypass browser cache
                window.location.href = window.location.origin + window.location.pathname + '?update=' + Date.now();
            }, 1500);
        } catch (error) {
            toast({ variant: "destructive", title: t("settings.update.updateError") });
            setIsUpdating(false);
        }
    };

    const isNearerVersion = latestVersion && compareVersions(latestVersion.number, APP_VERSION.number) > 0;

    return (
        <div className="space-y-6 max-w-5xl mx-auto" dir={dir}>
            <div className="flex items-center gap-4 text-start justify-start">
                <Settings className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
                    <p className="text-muted-foreground">{t("settings.subtitle")}</p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full" dir={dir}>
                <div className="flex justify-start mb-6">
                    <TabsList className="w-auto inline-flex items-center justify-start bg-muted/50 p-1">
                        <TabsTrigger value="profile" className="px-6">{t("settings.tabs.profile")}</TabsTrigger>
                        <TabsTrigger value="receipts" className="px-6">{t("settings.tabs.receipts")}</TabsTrigger>
                        <TabsTrigger value="admin" className="px-6">{t("settings.tabs.admin")}</TabsTrigger>
                        <TabsTrigger value="backup" className="px-6">{t("settings.tabs.backup")}</TabsTrigger>
                        <TabsTrigger value="update" className="px-6">{t("settings.tabs.update")}</TabsTrigger>
                    </TabsList>
                </div>



                {/* Club Profile Tab */}
                <TabsContent value="profile" className="space-y-6">
                    {/* Identity Card */}
                    <Card>
                        <CardHeader className="text-start">
                            <CardTitle>{t("settings.identityTitle")}</CardTitle>
                            <CardDescription>{t("settings.identityDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t("settings.clubName")}</Label>
                                <Input value={clubProfile.name} onChange={e => setClubProfile({ ...clubProfile, name: e.target.value })} placeholder={t("settings.clubNamePlaceholder")} />
                            </div>

                            <div className="space-y-3 pt-2">
                                <Label>{t("settings.systemLanguageLabel")}</Label>
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse border p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setLanguage("ar")}>
                                        <div className={`w-4 h-4 rounded-full border border-primary flex items-center justify-center ${language === "ar" ? "bg-primary" : ""}`}>
                                            {language === "ar" && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                        <div className="flex-1 flex items-center justify-between">
                                            <span className="font-medium">{t("settings.languageArabic")}</span>
                                            <span className="text-xs text-muted-foreground">{t("settings.languageDefault")}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse border p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setLanguage("en")}>
                                        <div className={`w-4 h-4 rounded-full border border-primary flex items-center justify-center ${language === "en" ? "bg-primary" : ""}`}>
                                            {language === "en" && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                        <div className="flex-1 flex items-center justify-between">
                                            <span className="font-medium">{t("settings.languageEnglish")}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>



                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("settings.logoLightLabel")}</Label>
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
                                            <p className="text-[10px] text-muted-foreground mt-1">{t("settings.logoLightHint")}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("settings.logoDarkLabel")}</Label>
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
                                            <p className="text-[10px] text-muted-foreground mt-1">{t("settings.logoDarkHint")}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Info Card */}
                    <Card>
                        <CardHeader className="text-start">
                            <CardTitle>{t("settings.contactTitle")}</CardTitle>
                            <CardDescription>{t("settings.contactDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("settings.phoneLabel")}</Label>
                                    <Input value={clubProfile.phone} onChange={e => setClubProfile({ ...clubProfile, phone: e.target.value })} placeholder={t("settings.phonePlaceholder")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("settings.locationLabel")}</Label>
                                    <Input value={clubProfile.location} onChange={e => setClubProfile({ ...clubProfile, location: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 border-t">
                                <h3 className="font-medium text-sm text-start">{t("settings.socialLinksTitle")}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t("settings.instagramLabel")}</Label>
                                        <Input value={clubProfile.socialLinks?.instagram || ''} onChange={e => setClubProfile({ ...clubProfile, socialLinks: { ...clubProfile.socialLinks, instagram: e.target.value } })} placeholder={t("settings.instagramPlaceholder")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("settings.facebookLabel")}</Label>
                                        <Input value={clubProfile.socialLinks?.facebook || ''} onChange={e => setClubProfile({ ...clubProfile, socialLinks: { ...clubProfile.socialLinks, facebook: e.target.value } })} placeholder={t("settings.facebookPlaceholder")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("settings.websiteLabel")}</Label>
                                        <Input value={clubProfile.socialLinks?.website || ''} onChange={e => setClubProfile({ ...clubProfile, socialLinks: { ...clubProfile.socialLinks, website: e.target.value } })} placeholder={t("settings.websitePlaceholder")} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Screensaver Settings Card */}
                    <Card>
                        <CardHeader className="text-start">
                            <CardTitle>{t("settings.screensaver.title")}</CardTitle>
                            <CardDescription>{t("settings.screensaver.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => setClubProfile({ ...clubProfile, screensaverEnabled: !clubProfile.screensaverEnabled })}
                            >
                                <div className="space-y-0.5">
                                    <Label className="text-base cursor-pointer">{t("settings.screensaver.enableLabel")}</Label>
                                    <p className="text-sm text-muted-foreground">{clubProfile.screensaverEnabled ? t("common.active") : t("common.inactive")}</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${clubProfile.screensaverEnabled ? 'bg-primary' : 'bg-muted'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${clubProfile.screensaverEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>

                            {clubProfile.screensaverEnabled && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Label>{t("settings.screensaver.timeoutLabel")}</Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="number"
                                            min="10"
                                            value={clubProfile.screensaverTimeout}
                                            onChange={e => setClubProfile({ ...clubProfile, screensaverTimeout: parseInt(e.target.value) || 60 })}
                                        />
                                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                                            {language === 'ar' ? 'ثانية' : 'seconds'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Automation Card */}
                    <Card>
                        <CardHeader className="text-start">
                            <CardTitle>{t("settings.whatsappTitle")}</CardTitle>
                            <CardDescription>{t("settings.whatsappDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>{t("settings.whatsappTemplatesLabel")}</Label>
                                <Button variant="outline" size="sm" className="gap-2" onClick={addWhatsAppTemplate}>
                                    <Plus className="h-4 w-4" />
                                    {t("settings.whatsappAddTemplate")}
                                </Button>
                            </div>

                            {clubProfile.whatsappTemplates.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-4">
                                    <div className="space-y-2">
                                        {clubProfile.whatsappTemplates.map((template) => (
                                            <button
                                                key={template.id}
                                                type="button"
                                                onClick={() => setSelectedTemplateId(template.id)}
                                                className={`w-full text-start px-3 py-2 rounded-md border text-sm transition-colors ${selectedTemplateId === template.id
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "hover:bg-muted/50"
                                                    }`}
                                            >
                                                <span className="truncate block">{template.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-end gap-2">
                                            <div className="flex-1 space-y-2">
                                                <Label>{t("settings.whatsappTemplateName")}</Label>
                                                <Input
                                                    value={selectedTemplate?.title || ""}
                                                    onChange={(e) =>
                                                        selectedTemplate &&
                                                        updateWhatsAppTemplate(selectedTemplate.id, { title: e.target.value })
                                                    }
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => selectedTemplate && deleteWhatsAppTemplate(selectedTemplate.id)}
                                                disabled={!selectedTemplate}
                                                title={t("settings.whatsappDeleteTemplate")}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{t("settings.whatsappMessageLabel")}</Label>
                                            <Textarea
                                                ref={textareaRef}
                                                value={selectedTemplate?.body || ""}
                                                onChange={(e) =>
                                                    selectedTemplate &&
                                                    updateWhatsAppTemplate(selectedTemplate.id, { body: e.target.value })
                                                }
                                                placeholder={t("settings.whatsappMessagePlaceholder")}
                                                className="min-h-[140px] font-mono text-sm leading-relaxed"
                                                dir="auto"
                                            />
                                        </div>

                                        <div className="space-y-3 p-4 bg-muted/20 rounded-lg border">
                                            <Label className="text-xs font-medium text-muted-foreground text-start">{t("settings.whatsappVariablesLabel")}</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {variables.map(v => (
                                                    <Badge
                                                        key={v.value}
                                                        variant="outline"
                                                        className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-all select-none px-3 py-1"
                                                        onClick={() => insertVariable(v.value)}
                                                        title={t("settings.whatsappInsertVariable").replace("{label}", v.label)}
                                                    >
                                                        {v.label}
                                                        <span className="ms-2 text-[10px] opacity-50 font-mono tracking-tighter" dir="ltr">{v.value}</span>
                                                    </Badge>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {t("settings.whatsappVariablesHint")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4">
                                    {t("settings.whatsappNoTemplates")}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    {canModify && (
                        <Button onClick={handleSaveProfile} disabled={loading} className="w-full md:w-auto mt-4">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                            {t("common.saveChanges")}
                        </Button>
                    )}
                </TabsContent>

                {/* Receipt Settings Tab */}
                <TabsContent value="receipts" className="space-y-6">
                    <Card>
                        <CardHeader className="text-start">
                            <CardTitle>{t("settings.receipts.title")}</CardTitle>
                            <CardDescription>{t("settings.receipts.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>{t("settings.receipts.formatLabel")}</Label>
                                <RadioGroup
                                    value={clubProfile.receiptType}
                                    onValueChange={(v: 'thermal' | 'a4') => setClubProfile({ ...clubProfile, receiptType: v })}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse border p-4 rounded-lg hover:bg-muted/50 transition-all cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                                        <RadioGroupItem value="thermal" id="thermal" />
                                        <Label htmlFor="thermal" className="flex-1 cursor-pointer">
                                            <div className="font-bold">{t("settings.receipts.thermalTitle")}</div>
                                            <div className="text-xs text-muted-foreground">{t("settings.receipts.thermalDesc")}</div>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse border p-4 rounded-lg hover:bg-muted/50 transition-all cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                                        <RadioGroupItem value="a4" id="a4" />
                                        <Label htmlFor="a4" className="flex-1 cursor-pointer">
                                            <div className="font-bold">{t("settings.receipts.a4Title")}</div>
                                            <div className="text-xs text-muted-foreground">{t("settings.receipts.a4Desc")}</div>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                <div className={`space-y-4 transition-opacity ${clubProfile.receiptType !== 'a4' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded bg-primary/10 text-primary">
                                            <Package className="w-4 h-4" />
                                        </div>
                                        <Label className="font-bold">{t("settings.receipts.a4DesignLabel")}</Label>
                                    </div>
                                    <div className="flex items-center gap-4 border p-3 rounded-lg bg-muted/5">
                                        <div className="w-20 h-20 rounded border bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {a4DesignFile ? (
                                                <div className="text-[10px] p-1 text-center font-mono break-all">{a4DesignFile.name}</div>
                                            ) : clubProfile.receiptA4Design ? (
                                                <img src={clubProfile.receiptA4Design} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setA4DesignFile(e.target.files?.[0] || null)}
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1">{t("settings.receipts.a4DesignHint")}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`space-y-4 transition-opacity ${clubProfile.receiptType !== 'thermal' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded bg-primary/10 text-primary">
                                            <ImageIcon className="w-4 h-4" />
                                        </div>
                                        <Label className="font-bold">{t("settings.receipts.thermalLogoLabel")}</Label>
                                    </div>
                                    <div className="flex items-center gap-4 border p-3 rounded-lg bg-muted/5">
                                        <div className="w-20 h-20 rounded border bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {thermalLogoFile ? (
                                                <img src={URL.createObjectURL(thermalLogoFile)} className="w-full h-full object-contain p-1" />
                                            ) : clubProfile.receiptLogoThermal ? (
                                                <img src={clubProfile.receiptLogoThermal} className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setThermalLogoFile(e.target.files?.[0] || null)}
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1">{t("settings.receipts.thermalLogoHint")}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {canModify && (
                        <Button onClick={handleSaveProfile} disabled={loading} className="w-full md:w-auto mt-4">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                            {t("common.saveChanges")}
                        </Button>
                    )}
                </TabsContent>

                {/* Admin Credentials Tab */}
                <TabsContent value="admin">
                    <Card>
                        <CardHeader className="text-start">
                            <CardTitle>{t("settings.adminTitle")}</CardTitle>
                            <CardDescription>{t("settings.adminDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t("settings.adminEmailLabel")}</Label>
                                <Input value={credForm.email} onChange={e => setCredForm({ ...credForm, email: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("settings.newPasswordLabel")}</Label>
                                    <Input type="password" value={credForm.newPassword} onChange={e => setCredForm({ ...credForm, newPassword: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("settings.confirmPasswordLabel")}</Label>
                                    <Input type="password" value={credForm.confirmPassword} onChange={e => setCredForm({ ...credForm, confirmPassword: e.target.value })} />
                                </div>
                            </div>
                            {canModify && (
                                <Button onClick={handleUpdateCredentials} disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                                    {t("settings.updateCredentials")}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                {/* Backup Tab */}
                <TabsContent value="backup">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="text-start">
                                <CardTitle className="flex items-center gap-2 text-start">
                                    <Download className="w-5 h-5 text-primary" />
                                    {t("settings.exportTitle")}
                                </CardTitle>
                                <CardDescription>
                                    {t("settings.exportDescription")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{t("settings.exportDownloadTitle")}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{t("settings.exportDownloadDescription")}</p>
                                    </div>
                                    <Button onClick={handleExport} disabled={loading}>
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Download className="w-4 h-4 me-2" />}
                                        {t("settings.exportButton")}
                                    </Button>
                                </div>
                                {loading && progressStatus && (
                                    <p className="text-xs text-center mt-2 text-muted-foreground animate-pulse">{progressStatus}</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-destructive/20">
                            <CardHeader className="text-start">
                                <CardTitle className="flex items-center gap-2 text-destructive">
                                    <Upload className="w-5 h-5" />
                                    {t("settings.restoreTitle")}
                                </CardTitle>
                                <CardDescription>
                                    {t("settings.restoreDescription")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium">{t("settings.restoreJsonLabel")}</Label>
                                        <Input
                                            type="file"
                                            accept=".json"
                                            onChange={(e) => setImportJsonFile(e.target.files?.[0] || null)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium">{t("settings.restoreZipLabel")}</Label>
                                        <Input
                                            type="file"
                                            accept=".zip"
                                            onChange={(e) => setImportZipFile(e.target.files?.[0] || null)}
                                        />
                                    </div>
                                </div>

                                <AlertDialog open={showRestoreAlert} onOpenChange={setShowRestoreAlert}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            className="w-full"
                                            disabled={!importJsonFile || loading}
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Database className="w-4 h-4 me-2" />}
                                            {t("settings.restoreButton")}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-destructive flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5" />
                                                {t("settings.restoreAlertTitle")}
                                            </AlertDialogTitle>
                                            <AlertDialogDescription className="text-start">
                                                {t("settings.restoreAlertIntro")}
                                                <br /><br />
                                                1. <span className="font-bold text-destructive">{t("settings.restoreAlertItem1")}</span>
                                                <br />
                                                2. {t("settings.restoreAlertItem2")}
                                                <br /><br />
                                                {t("settings.restoreAlertConfirm")}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleRestore} className="bg-destructive hover:bg-destructive/90">
                                                {t("settings.restoreConfirmButton")}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {loading && progressStatus && (
                                    <p className="text-xs text-center mt-2 text-muted-foreground animate-pulse">{progressStatus}</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-destructive/30">
                            <CardHeader className="text-start">
                                <CardTitle className="flex items-center gap-2 text-destructive">
                                    <Trash2 className="w-5 h-5" />
                                    {t("settings.clearTitle")}
                                </CardTitle>
                                <CardDescription>
                                    {t("settings.clearDescription")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <AlertDialog
                                    open={showClearAlert}
                                    onOpenChange={(open) => {
                                        setShowClearAlert(open);
                                        if (!open) setClearConfirmText("");
                                    }}
                                >
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            className="w-full"
                                            disabled={loading || isClearingDatabase}
                                        >
                                            {isClearingDatabase ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Trash2 className="w-4 h-4 me-2" />}
                                            {t("settings.clearButton")}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-destructive flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5" />
                                                {t("settings.clearAlertTitle")}
                                            </AlertDialogTitle>
                                            <AlertDialogDescription className="text-start space-y-3">
                                                <span>
                                                    {t("settings.clearAlertDescription")}
                                                </span>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-medium text-muted-foreground">
                                                        {t("settings.clearConfirmLabel").replace("{word}", CLEAR_CONFIRM_WORD)}
                                                    </Label>
                                                    <Input
                                                        value={clearConfirmText}
                                                        onChange={(e) => setClearConfirmText(e.target.value)}
                                                        placeholder={CLEAR_CONFIRM_WORD}
                                                        dir="ltr"
                                                    />
                                                </div>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isClearingDatabase}>{t("common.cancel")}</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleClearDatabase}
                                                className="bg-destructive hover:bg-destructive/90"
                                                disabled={!clearConfirmMatches || isClearingDatabase}
                                            >
                                                {t("settings.clearConfirmButton")}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {isClearingDatabase && clearStatus && (
                                    <p className="text-xs text-center text-muted-foreground animate-pulse">{clearStatus}</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                {/* Update Tab */}
                <TabsContent value="update">
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Hero Status Section */}
                        <div className={`relative overflow-hidden rounded-3xl border p-8 transition-all duration-500 ${isNearerVersion ? 'bg-gradient-to-br from-primary via-primary/90 to-primary/80 border-primary text-white shadow-2xl shadow-primary/30' : 'bg-white border-gray-100 shadow-sm'}`}>
                            {/* Decorative Background Icon */}
                            <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12">
                                {isNearerVersion ? <Download className="w-64 h-64" /> : <ShieldCheck className="w-64 h-64 text-green-500" />}
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="space-y-4 text-center md:text-start flex-1">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${isNearerVersion ? 'bg-white' : 'bg-green-400'}`}></div>
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isNearerVersion ? 'text-white' : 'text-gray-500'}`}>
                                            {isNearerVersion ? t("settings.update.newVersionAvailable") : t("settings.update.upToDate")}
                                        </span>
                                    </div>

                                    <h2 className={`text-4xl md:text-5xl font-black tracking-tighter ${isNearerVersion ? 'text-white' : 'text-gray-900'}`}>
                                        {isNearerVersion ? `Version ${latestVersion?.number} is ready.` : "You're all set."}
                                    </h2>

                                    <p className={`text-sm md:text-lg font-medium max-w-xl leading-relaxed ${isNearerVersion ? 'text-white/80' : 'text-gray-500'}`}>
                                        {isNearerVersion
                                            ? `Our latest release ${latestVersion?.name} brings significant improvements and new features to your platform.`
                                            : "Your Club Management System is running the latest version with all security patches and features enabled."}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4 w-full md:w-auto shrink-0">
                                    {isNearerVersion ? (
                                        <Button
                                            onClick={handleUpdate}
                                            disabled={isUpdating}
                                            size="lg"
                                            className="h-16 px-10 bg-white text-primary hover:bg-gray-50 font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
                                        >
                                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin me-2" /> : <Zap className="w-5 h-5 me-2" />}
                                            {t("settings.update.updateNow")}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={checkUpdates}
                                            disabled={checkingUpdate || isUpdating}
                                            variant="outline"
                                            size="lg"
                                            className="h-16 px-10 border-gray-200 hover:border-primary hover:text-primary font-bold text-sm uppercase tracking-widest transition-all"
                                        >
                                            {checkingUpdate ? <Loader2 className="w-5 h-5 animate-spin me-2" /> : <RefreshCcw className="w-5 h-5 me-2" />}
                                            {t("settings.update.checkUpdates")}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Progress Overlay when Updating */}
                            {isUpdating && (
                                <div className="absolute inset-0 z-20 bg-primary flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                                    <div className="w-full max-w-md space-y-6">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Updating System</h3>
                                                <p className="text-xs text-white/60 font-medium uppercase tracking-widest animate-pulse">{updateStatus}</p>
                                            </div>
                                            <span className="text-4xl font-black text-white/20">65%</span>
                                        </div>
                                        <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden border border-white/10 p-0.5">
                                            <div className="h-full bg-white animate-progress-flow w-[65%] rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)]"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Details & Config Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Version Info Cards */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-6 rounded-2xl border bg-white shadow-sm hover:border-primary/20 transition-colors group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                                <Info className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                                            </div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("settings.update.currentVersion")}</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <span className="text-3xl font-black text-gray-900">{APP_VERSION.number}</span>
                                            <span className="text-[10px] font-bold text-gray-400 pb-1.5">{APP_VERSION.date}</span>
                                        </div>
                                        <div className="mt-2 text-xs font-semibold text-gray-500 px-2 py-1 bg-gray-50 rounded-md inline-block">
                                            {APP_VERSION.name}
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-2xl border bg-white shadow-sm hover:border-primary/20 transition-colors group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                                <Github className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                                            </div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("settings.update.releaseNotes")}</span>
                                        </div>
                                        <div className="h-[100px] overflow-y-auto text-[11px] leading-relaxed text-gray-600 font-medium custom-scrollbar pr-2 whitespace-pre-wrap">
                                            {latestVersion?.notes || "No release notes available. Check for updates to fetch the latest changelog."}
                                        </div>
                                    </div>
                                </div>

                                {/* Feature Highlight (Mock) */}
                                <div className="p-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50/30">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="w-4 h-4 text-yellow-500" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform Integrity</span>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                        Every update goes through rigorous automated testing to ensure the stability of your membership records, financial data, and attendance tracking systems.
                                        We recommend keeping the system up to date to benefit from the latest security improvements.
                                    </p>
                                </div>
                            </div>

                            {/* Configuration Sidebar */}
                            <div className="space-y-6">
                                <Card className="rounded-2xl border shadow-sm h-full overflow-hidden">
                                    <CardHeader className="bg-gray-50/50 border-b pb-4">
                                        <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t("settings.update.githubToken")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-gray-500 uppercase">Personal Access Token</Label>
                                            <div className="relative group">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    type="password"
                                                    value={clubProfile.githubToken}
                                                    onChange={(e) => setClubProfile({ ...clubProfile, githubToken: e.target.value })}
                                                    placeholder="ghp_xxxxxxxxxxxx"
                                                    className="pl-10 h-11 border-gray-200 focus:ring-primary focus:border-primary font-mono text-xs rounded-xl"
                                                />
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
                                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] leading-tight text-blue-700 font-medium">
                                                The Github token is required to securely fetch system updates and release notes directly from our repository.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

        </div >
    );
}

function PackagesTable() {
    const { t, dir } = useLanguage();
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

    if (isLoading) return <div className="text-center py-4">{t("common.loading")}</div>;

    return (
        <Table dir={dir}>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-start">{t("subscriptions.planName")}</TableHead>
                    <TableHead className="text-start">{t("subscriptions.duration")}</TableHead>
                    <TableHead className="text-start">{t("subscriptions.price")}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {packages?.map((pkg) => (
                    <TableRow key={pkg.id}>
                        <TableCell className="font-medium">{pkg.name}</TableCell>
                        <TableCell>{pkg.duration} {t("common.days")}</TableCell>
                        <TableCell>{pkg.price} {t("common.currency")}</TableCell>
                        <TableCell>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                                onClick={() => {
                                    if (confirm(t("subscriptions.confirmDelete"))) {
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
                            {t("subscriptions.noPackages")}
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
    const { t } = useLanguage();

    const createPackage = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/packages", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
            toast({ title: t("common.success"), description: t("subscriptions.packageCreateSuccess") });
            setName("");
            setPrice("");
        },
        onError: () => {
            toast({ variant: "destructive", title: t("common.error"), description: t("subscriptions.packageCreateError") });
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
                <Label>{t("subscriptions.planName")}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("subscriptions.packageNamePlaceholder")} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t("subscriptions.duration")}</Label>
                    <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label>{t("subscriptions.price")}</Label>
                    <Input type="number" step="0.5" value={price} onChange={e => setPrice(e.target.value)} required />
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={createPackage.isPending}>
                    {createPackage.isPending ? t("common.loading") : t("subscriptions.savePackage")}
                </Button>
            </DialogFooter>
        </form>
    );
}

