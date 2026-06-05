import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { apiJson, apiFetch } from "@/lib/api";
import {
    Settings, UserCog, Building2, Save, ImageIcon, Loader2,
    Package, Plus, Trash2, Download, Upload, Database,
    AlertTriangle
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getSubscriptionPackages } from "@/lib/apiData";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SubscriptionPackage } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    receiptType: 'thermal' | 'a4';
    receiptLogoThermal: string;
    receiptA4Design: string;
    screensaverEnabled: boolean;
    screensaverTimeout: number;
};

export default function SystemSettings() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { user, refreshClubSettings, hasPermission } = useAuth();
    const canEdit = hasPermission(PERMISSIONS.SETTINGS_MODIFY);
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
            const data = await apiJson<Record<string, unknown>>("/api/settings");
            if (data && Object.keys(data).length > 0) {
                const socials = (data.socials as Record<string, string>) || {};
                const templates = normalizeWhatsAppTemplates(
                    data.whatsappTemplates as WhatsAppTemplate[] | undefined,
                    data.whatsappTemplate as string | undefined,
                );
                setClubProfile({
                    name: (data.name as string) || "",
                    logoUrlLight: (data.logoUrlLight as string) || "",
                    logoUrlDark: (data.logoUrlDark as string) || "",
                    phone: (data.phone as string) || "",
                    location: (data.location as string) || "",
                    facebook: socials.facebook || "",
                    instagram: socials.instagram || "",
                    twitter: socials.twitter || "",
                    socialLinks: { instagram: socials.instagram || "", facebook: socials.facebook || "", website: "" },
                    whatsappTemplates: templates,
                    receiptType: (data.receiptType as 'thermal' | 'a4') || 'thermal',
                    receiptLogoThermal: (data.receiptLogoThermal as string) || "",
                    receiptA4Design: (data.receiptA4Design as string) || "",
                    screensaverEnabled: (data.screensaverEnabled as boolean) ?? false,
                    screensaverTimeout: (data.screensaverTimeout as number) ?? 60,
                });
                setSelectedTemplateId(templates[0]?.id || null);
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        }
    };

    const uploadSettingFile = async (file: File, category: string) => {
        const form = new FormData();
        form.append("file", file);
        form.append("category", category);
        const res = await apiFetch("/api/settings/upload", { method: "POST", body: form });
        const data = await res.json();
        return data.url as string;
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            let finalLogoUrlLight = clubProfile.logoUrlLight;
            let finalLogoUrlDark = clubProfile.logoUrlDark;
            if (logoFileLight) finalLogoUrlLight = await uploadSettingFile(logoFileLight, "logo_light");
            if (logoFileDark) finalLogoUrlDark = await uploadSettingFile(logoFileDark, "logo_dark");

            let finalThermalLogoUrl = clubProfile.receiptLogoThermal;
            let finalA4DesignUrl = clubProfile.receiptA4Design;
            if (thermalLogoFile) finalThermalLogoUrl = await uploadSettingFile(thermalLogoFile, "receipt_thermal_logo");
            if (a4DesignFile) finalA4DesignUrl = await uploadSettingFile(a4DesignFile, "receipt_a4_design");

            const socialLinks = clubProfile.socialLinks ?? {};
            await apiJson("/api/settings", {
                method: "PATCH",
                body: JSON.stringify({
                    name: clubProfile.name,
                    logoUrlLight: finalLogoUrlLight,
                    logoUrlDark: finalLogoUrlDark,
                    phone: clubProfile.phone,
                    location: clubProfile.location,
                    socials: {
                        facebook: socialLinks.facebook || clubProfile.facebook,
                        instagram: socialLinks.instagram || clubProfile.instagram,
                        twitter: clubProfile.twitter,
                    },
                    whatsappTemplate: clubProfile.whatsappTemplates[0]?.body || "",
                    whatsappTemplates: clubProfile.whatsappTemplates,
                    receiptType: clubProfile.receiptType,
                    receiptLogoThermal: finalThermalLogoUrl,
                    receiptA4Design: finalA4DesignUrl,
                    screensaverEnabled: clubProfile.screensaverEnabled,
                    screensaverTimeout: clubProfile.screensaverTimeout,
                }),
            });

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
                await apiJson("/api/auth/email", {
                    method: "PATCH",
                    body: JSON.stringify({ email: credForm.email, password: credForm.newPassword || credForm.confirmPassword }),
                });
                await apiJson("/api/settings", { method: "PATCH", body: JSON.stringify({ managerEmail: credForm.email }) });
                toast({ title: t("common.success"), description: t("settings.emailUpdateSuccess") });
            }
            if (credForm.newPassword) {
                if (credForm.newPassword !== credForm.confirmPassword) {
                    throw new Error(t("settings.passwordMismatch"));
                }
                await apiJson("/api/auth/password", {
                    method: "PATCH",
                    body: JSON.stringify({ currentPassword: credForm.confirmPassword, newPassword: credForm.newPassword }),
                });
                setCredForm(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
                toast({ title: t("common.success"), description: t("settings.passwordUpdateSuccess") });
            }
        } catch (error: unknown) {
            toast({ variant: "destructive", title: t("common.error"), description: (error as Error).message });
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
            event.target.value = "";
            return;
        }
        setLoading(true);
        try {
            await importFullDatabase(file, null, (status) => setProgressStatus(status));
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
                    {canEdit && (
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-0">
                                <div className="space-y-4">
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

                                <div className="space-y-4">
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

                    {canEdit && (
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
                            {canEdit && (
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

                        <Card className="border-destructive/30" style={{ display: "none" }}>
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

