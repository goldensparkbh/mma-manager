import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Member, Belt, Subscription, Sale, Product, InsertSale, InsertMember, Attendance, InsertAttendance, MemberBelt, SubscriptionPackage } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useRef, useMemo, useEffect } from "react";
import { printReceipt } from "@/lib/receipt-printer";
import { ReceiptTypeDialog } from "./receipt-type-dialog";
import { useAuth } from "@/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { updateMemberDocuments, deleteMemberDocument, assignBeltToMember, getSubscriptionPackages, createSubscription, getSubscriptionsByMember, getMemberBelts, revokeMemberBelt, getSalesByMember, payReceipt, deleteReceipt, deleteSale, createAttendance, deleteAttendance, deleteSubscription, getAttendanceByMember, syncMemberSubscriptionStatus } from "@/lib/firebaseData";
import { POSDialog } from "./pos-dialog";
import { WhatsAppTemplateDialog } from "@/components/whatsapp-template-dialog";
import { FileText, Trash2, Upload, AlertCircle, CheckCircle2, Pencil, Plus, History, ShoppingCart, Loader2, Package, Calendar, X, Printer, Download } from "lucide-react";
import { addMonths, addDays, isWithinInterval, parseISO, startOfDay, endOfDay, differenceInDays, isBefore, isAfter } from "date-fns";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { MemberReportPdf, type MemberReportData } from "@/components/member-report-pdf";

interface MemberDetailsDialogProps {
    member: Member | null;
    isOpen: boolean;
    onClose: () => void;
    onAddSubscription?: () => void;
}

export function MemberDetailsDialog({ member, isOpen, onClose, onAddSubscription }: MemberDetailsDialogProps) {
    const { t, language, dir } = useLanguage();
    const { hasPermission, clubSettings } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("profile");
    const [isEditing, setIsEditing] = useState(false);

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const getCurrentTime = () => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    };

    // Form States
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [documentFiles, setDocumentFiles] = useState<File[]>([]);
    const [pendingDocuments, setPendingDocuments] = useState<{ file: File; label: string }[]>([]);
    const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
    const [documentInputKey, setDocumentInputKey] = useState(0);
    const [formData, setFormData] = useState<Partial<InsertMember>>({
        name: "",
        firstName: "",
        fatherName: "",
        lastName: "",
        phone: "",
        email: "",
        dob: "",
        gender: undefined,
        age: undefined,
        height: "",
        weight: "",
        bloodType: "",
        beltSize: "",
        suitSize: "",
        healthNotes: "",
        status: "active",
        balance: 0,
    });

    // States
    const [isPOSOpen, setIsPOSOpen] = useState(false);
    const [showAddSubForm, setShowAddSubForm] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState<string>("");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentStatus, setPaymentStatus] = useState("paid");
    const [showAssignBeltForm, setShowAssignBeltForm] = useState(false);
    const [selectedBeltId, setSelectedBeltId] = useState<string>("");
    const [awardDate, setAwardDate] = useState(new Date().toISOString().split('T')[0]);
    const [showAddAttendanceForm, setShowAddAttendanceForm] = useState(false);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceTime, setAttendanceTime] = useState(() => getCurrentTime());
    const [attendanceNotes, setAttendanceNotes] = useState("");
    const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isDownloadingReport, setIsDownloadingReport] = useState(false);
    const [isReceiptTypeDialogOpen, setIsReceiptTypeDialogOpen] = useState(false);
    const [printData, setPrintData] = useState<any>(null);
    const [printType, setPrintType] = useState<'sale' | 'subscription' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Store Purchase State
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [quantity, setQuantity] = useState(1);

    // Queries
    const { data: belts } = useQuery<Belt[]>({
        queryKey: ["/api/belts"],
        enabled: isOpen
    });

    const { data: products } = useQuery<Product[]>({
        queryKey: ["/api/products"],
        enabled: isOpen && activeTab === "finance"
    });

    const { data: memberSales, isLoading: loadingSales, isError: errorSales } = useQuery<Sale[]>({
        queryKey: ["/api/sales/member", member?.id],
        queryFn: () => member ? getSalesByMember(member.id) : Promise.resolve([]),
        enabled: isOpen && !!member
    });

    const { data: memberSubscriptions, isLoading: loadingSubs, isError: errorSubs } = useQuery<Subscription[]>({
        queryKey: ["/api/subscriptions/member", member?.id],
        queryFn: () => member ? getSubscriptionsByMember(member.id) : Promise.resolve([]),
        enabled: isOpen && !!member
    });

    const { data: memberBelts } = useQuery<MemberBelt[]>({
        queryKey: ["/api/belts/member", member?.id],
        queryFn: () => member ? getMemberBelts(member.id) : Promise.resolve([]),
        enabled: isOpen && !!member && activeTab === "belts"
    });

    const { data: packages } = useQuery<SubscriptionPackage[]>({
        queryKey: ["/api/subscription-packages"],
        queryFn: getSubscriptionPackages,
        enabled: isOpen && activeTab === "subscriptions"
    });

    const selectedPackage = useMemo(
        () => packages?.find(pkg => pkg.id === selectedPackageId),
        [packages, selectedPackageId]
    );

    // Auto-sync status if it looks incorrect
    useEffect(() => {
        if (isOpen && member && memberSubscriptions) {
            // Trigger a logic-check re-sync if the current status is inactive but we see subscriptions
            // This is a safety net for any missed backend syncs.
            if (member.status === "inactive" && memberSubscriptions.length > 0) {
                syncMemberSubscriptionStatus(member.id).then(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/members"] });
                });
            }
        }
    }, [isOpen, member?.id, member?.status, memberSubscriptions]);

    const endDatePreview = useMemo(() => {
        if (!selectedPackage || !startDate) return "";
        const parts = startDate.split("-").map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return "";
        const start = new Date(parts[0], parts[1] - 1, parts[2]);
        const end = addDays(start, selectedPackage.duration);
        return end.toISOString().split("T")[0];
    }, [selectedPackage, startDate]);

    const hasOverlappingSubscription = useMemo(() => {
        if (!startDate || !endDatePreview) return false;
        if (!memberSubscriptions?.length) return false;
        try {
            const selectedStart = startOfDay(parseISO(startDate));
            const selectedEnd = endOfDay(parseISO(endDatePreview));
            return memberSubscriptions.some((sub) => {
                if (!sub.startDate || !sub.endDate) return false;
                const subStart = startOfDay(parseISO(sub.startDate));
                const subEnd = endOfDay(parseISO(sub.endDate));
                return selectedStart <= subEnd && selectedEnd >= subStart;
            });
        } catch {
            return false;
        }
    }, [memberSubscriptions, startDate, endDatePreview]);
    const { data: memberAttendance, isLoading: loadingAttendance } = useQuery<Attendance[]>({
        queryKey: ["/api/attendance/member", member?.memberId, member?.id],
        queryFn: async () => {
            if (!member) return [];
            const ids = [member.memberId, member.id].filter((id, index, self) => id && self.indexOf(id) === index);
            console.log('Fetching attendance for member:', member.name, 'ids:', ids);
            const data = await getAttendanceByMember(ids);
            console.log('Attendance data received:', data);
            return data;
        },
        enabled: isOpen && !!member && activeTab === "attendance"
    });

    const groupedSales = useMemo(() => {
        if (!memberSales) return [];

        const groups: { [key: string]: Sale[] } = {};
        memberSales.forEach(sale => {
            const gid = sale.receiptId || `S-${sale.id}`; // Prefix for single sales
            if (!groups[gid]) groups[gid] = [];
            groups[gid].push(sale);
        });

        return Object.entries(groups).map(([id, items]) => {
            const hasUnpaid = items.some(i => i.paymentStatus === 'unpaid');
            return {
                id: id,
                isRealReceipt: !!items[0].receiptId,
                date: items[0].date,
                items: items,
                total: items.reduce((sum, item) => sum + item.totalPrice, 0),
                paymentStatus: hasUnpaid ? 'unpaid' : 'paid',
                paymentMethod: items[0].paymentMethod,
                memberName: member?.name,
                memberId: member?.id,
                memberDisplayId: member?.memberId
            };
        }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    }, [memberSales]);

    const calculatedBalance = useMemo(() => {
        if (!member) return 0;
        let balance = member.balance || 0;

        // Subtract unpaid subscriptions
        if (memberSubscriptions) {
            const unpaidSubs = memberSubscriptions
                .filter(s => s.paymentStatus !== 'paid')
                .reduce((sum, s) => sum + s.amount, 0);
            balance -= unpaidSubs;
        }

        // Subtract unpaid sales
        if (memberSales) {
            const unpaidSales = memberSales
                .filter(s => s.paymentStatus === 'unpaid')
                .reduce((sum, s) => sum + s.totalPrice, 0);
            balance -= unpaidSales;
        }

        return balance;
    }, [member, memberSubscriptions, memberSales]);

    const memberForWhatsApp = useMemo(() => {
        if (!member) return null;
        return {
            ...member,
            balance: calculatedBalance
        };
    }, [member, calculatedBalance]);

    // Mutations
    const buyItemMutation = useMutation({
        mutationFn: async (data: InsertSale) => {
            return await createSale(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales/member", member?.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Update stock
            toast({
                title: t('common.success'),
                description: t("store.purchaseSuccess"),
            });
            setSelectedProductId("");
            setQuantity(1);
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: t('common.error'),
                description: error.message,
            });
        }
    });

    const payReceiptMutation = useMutation({
        mutationFn: async ({ receiptId, method }: { receiptId: string, method: string }) => {
            return await payReceipt(receiptId, method);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales/member", member?.id] });
            toast({ title: t('common.success'), description: t("finance.receiptPaidSuccess") });
        },
        onError: (error: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: error.message });
        }
    });

    const deleteReceiptMutation = useMutation({
        mutationFn: async (receiptId: string) => {
            return await deleteReceipt(receiptId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales/member", member?.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({ title: t('common.success'), description: t('finance.deleteReceiptSuccess') });
        },
        onError: (error: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: error.message });
        }
    });

    const deleteSaleMutation = useMutation({
        mutationFn: async (saleId: string) => {
            return await deleteSale(saleId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales/member", member?.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({ title: t('common.success'), description: t('finance.deleteSaleSuccess') });
        },
        onError: (error: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: error.message });
        }
    });

    const addAttendanceMutation = useMutation({
        mutationFn: async (data: InsertAttendance) => {
            return await createAttendance(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/attendance/member", member?.memberId] });
            queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
            queryClient.invalidateQueries({ queryKey: ["/api/attendance/all"] });
            toast({ title: t('common.success'), description: t('attendance.addAttendanceSuccess') });
            setShowAddAttendanceForm(false);
            setAttendanceNotes("");
            setAttendanceTime(getCurrentTime());
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: t('common.error'),
                description: error.message || t('attendance.addAttendanceError'),
            });
        }
    });

    const deleteAttendanceMutation = useMutation({
        mutationFn: async (id: string) => {
            return await deleteAttendance(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/attendance/member", member?.memberId] });
            queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
            queryClient.invalidateQueries({ queryKey: ["/api/attendance/all"] });
            toast({ title: t('common.success'), description: t('attendance.deleteSuccess') || "Attendance deleted" });
        },
        onError: (error: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: error.message });
        }
    });

    const handleBuyItem = () => {
        if (!member || !selectedProductId) return;

        const product = products?.find(p => p.id === selectedProductId);
        if (!product) return;

        const saleData: InsertSale = {
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            unitPrice: product.price,
            totalPrice: product.price * quantity,
            memberId: member.id,
            buyerName: member.name,
            buyerPhone: member.phone,
            date: new Date().toISOString(),
            status: "completed",
            paymentMethod: "cash" // Default for now
        };

        buyItemMutation.mutate(saleData);
    };

    const getSubscriptionStatus = (startDateStr: string, endDateStr: string) => {
        try {
            const now = startOfDay(new Date());
            const start = startOfDay(parseISO(startDateStr));
            const end = endOfDay(parseISO(endDateStr));
            if (isBefore(now, start)) return 'upcoming';
            if (isAfter(now, end)) return 'expired';
            const daysLeft = differenceInDays(end, now);
            if (daysLeft <= 5) return 'aboutToExpire';
            return 'active';
        } catch (e) {
            return 'active';
        }
    };

    const memberSubscriptionStatus = useMemo(() => {
        if (!member) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fallback to member.status ONLY IF it's "upcoming"
        if (!member.subscriptionEnd) {
            if (member.status === "upcoming") {
                return "upcoming";
            }
            return "inactive";
        }

        const end = new Date(member.subscriptionEnd);
        const start = member.subscriptionStart ? new Date(member.subscriptionStart) : null;

        if (Number.isNaN(end.getTime())) {
            return member.status === "upcoming" ? "upcoming" : "inactive";
        }

        end.setHours(0, 0, 0, 0);
        if (start) start.setHours(0, 0, 0, 0);

        if (start && today < start) {
            return "upcoming";
        }

        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return "expired";
        if (diffDays <= 10) return "aboutToExpire";
        return "active";
    }, [member]);

    const createSubscriptionMutation = useMutation({
        mutationFn: async (data: any) => {
            return await createSubscription(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/member", member?.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/members"] });
            toast({ title: t('common.success'), description: t("subscriptions.createSuccess") });
            setShowAddSubForm(false);
            setSelectedPackageId("");
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        }
    });

    const deleteSubscriptionMutation = useMutation({
        mutationFn: async (id: string) => {
            return await deleteSubscription(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/member", member?.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/members"] });
            queryClient.invalidateQueries({ queryKey: ["/api/sales/member", member?.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({ title: t('common.success'), description: t('subscriptions.deleteSuccess') || "Subscription deleted" });
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        }
    });

    const assignBeltMutation = useMutation({
        mutationFn: async (data: { memberId: string, beltId: string, awardedAt: string }) => {
            return await assignBeltToMember(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/belts/member", member?.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/members"] });
            toast({ title: t('common.success'), description: t("belts.assignSuccess") });
            setShowAssignBeltForm(false);
            setSelectedBeltId("");
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        }
    });

    const revokeBeltMutation = useMutation({
        mutationFn: async (id: string) => {
            return await revokeMemberBelt(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/belts/member", member?.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/members"] });
            toast({ title: t('common.success'), description: t("belts.revokeSuccess") });
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        }
    });

    const createMemberMutation = useMutation({
        mutationFn: async (data: InsertMember & { imageFile?: File | null, documentFiles?: File[] }) => {
            const response = await apiRequest("POST", "/api/members", data);
            return response.json();
        },
        onSuccess: (newMember: Member) => {
            queryClient.invalidateQueries({ queryKey: ["/api/members"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({ title: t('common.success'), description: t('members.addMemberSuccess') || "Member created" });
            setIsEditing(false);
            onClose(); // Close on creation as it's a new flow
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        }
    });

    const updateMemberMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<InsertMember> & { imageFile?: File | null, documentFiles?: File[] } }) => {
            const response = await apiRequest("PATCH", `/api/members/${id}`, data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/members"] });
            toast({ title: t('common.success'), description: t('members.editMemberSuccess') || "Member updated" });
            setIsEditing(false);
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: err.message });
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (member) {
                setFormData({
                    name: member.name,
                    firstName: member.firstName || "",
                    fatherName: member.fatherName || "",
                    lastName: member.lastName || "",
                    phone: member.phone,
                    cpr: member.cpr || "",
                    email: member.email || "",
                    dob: member.dob || "",
                    gender: member.gender as any,
                    age: member.age || undefined,
                    height: member.height || "",
                    weight: member.weight || "",
                    bloodType: member.bloodType || "",
                    beltSize: member.beltSize || "",
                    suitSize: member.suitSize || "",
                    healthNotes: member.healthNotes || "",
                    status: member.status,
                    balance: member.balance || 0,
                });
                setImagePreview(member.imageUrl || null);
                setIsEditing(false);
            } else {
                setFormData({
                    name: "",
                    firstName: "",
                    fatherName: "",
                    lastName: "",
                    phone: "",
                    cpr: "",
                    email: "",
                    dob: "",
                    gender: undefined,
                    age: undefined,
                    height: "",
                    weight: "",
                    bloodType: "",
                    beltSize: "",
                    suitSize: "",
                    healthNotes: "",
                    status: "active",
                    balance: 0,
                });
                setImagePreview(null);
                setIsEditing(true);
                setActiveTab("profile"); // Ensure we are on profile tab when adding
            }
            setImageFile(null);
            setDocumentFiles([]);
            setPendingDocuments([]);
            setIsUploadingDocuments(false);
            setDocumentInputKey((prev) => prev + 1);
            setShowAddAttendanceForm(false);
            setAttendanceDate(new Date().toISOString().split('T')[0]);
            setAttendanceTime(getCurrentTime());
            setAttendanceNotes("");
            setIsWhatsAppDialogOpen(false);
        }
    }, [isOpen, member]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: t('common.error'),
                description: t('members.imageTooLarge') || "Image must be less than 5MB",
                variant: "destructive",
            });
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setImagePreview((prev) => {
            if (prev?.startsWith("blob:")) {
                URL.revokeObjectURL(prev);
            }
            return previewUrl;
        });
        setImageFile(file);
    };

    const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFiles: File[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.size > 4 * 1024 * 1024) { // 4MB Limit
                toast({
                    title: t('common.error'),
                    description: `${file.name} is too large (>4MB)`,
                    variant: "destructive",
                });
                continue;
            }
            newFiles.push(file);
        }
        setDocumentFiles(prev => [...prev, ...newFiles]);
    };

    const handleDocumentSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newEntries: { file: File; label: string }[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.size > 4 * 1024 * 1024) {
                toast({
                    title: t('common.error'),
                    description: `${file.name} is too large (>4MB)`,
                    variant: "destructive",
                });
                continue;
            }
            const fallbackLabel = file.name.replace(/\.[^/.]+$/, "");
            newEntries.push({ file, label: fallbackLabel || file.name });
        }

        setPendingDocuments(prev => [...prev, ...newEntries]);
        setDocumentInputKey((prev) => prev + 1);
    };

    const handleUploadPendingDocuments = async () => {
        if (!member || pendingDocuments.length === 0 || isUploadingDocuments) return;
        const hasMissingLabel = pendingDocuments.some((entry) => !entry.label.trim());
        if (hasMissingLabel) {
            toast({
                title: t('common.error'),
                description: "Document label is required",
                variant: "destructive",
            });
            return;
        }
        setIsUploadingDocuments(true);
        try {
            await updateMemberDocuments(member.id, pendingDocuments);
            queryClient.invalidateQueries({ queryKey: ["/api/members"] });
            toast({ title: t('common.success'), description: t("members.documentsUploadSuccess") });
            setPendingDocuments([]);
        } catch (error: any) {
            toast({ variant: "destructive", title: t('common.error'), description: error?.message || t("members.uploadFailed") });
        } finally {
            setIsUploadingDocuments(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let finalName = formData.name;
        if (formData.firstName || formData.lastName) {
            finalName = [formData.firstName, formData.fatherName, formData.lastName].filter(Boolean).join(" ");
        }

        const submissionData = { ...formData, name: finalName };

        const missingRequired = !formData.firstName?.trim()
            || !formData.fatherName?.trim()
            || !formData.lastName?.trim()
            || !formData.phone?.trim()
            || !formData.gender
            || formData.age === undefined
            || formData.age === null;
        if (missingRequired) {
            toast({ variant: "destructive", title: t('common.error'), description: "Required fields are missing" });
            return;
        }

        if (formData.cpr && formData.cpr.length !== 9) {
            toast({ variant: "destructive", title: t('common.error'), description: t('members.cprInvalid') || "CPR must be 9 digits" });
            return;
        }

        if (member) {
            updateMemberMutation.mutate({ id: member.id, data: { ...submissionData, imageFile, documentFiles } });
        } else {
            createMemberMutation.mutate({ ...(submissionData as InsertMember), memberId: "temp", imageFile, documentFiles });
        }
    };

    const handleAssignBelt = () => {
        if (!member || !selectedBeltId) return;
        assignBeltMutation.mutate({
            memberId: member.id,
            beltId: selectedBeltId,
            awardedAt: awardDate
        });
    };

    const openAttendanceForm = () => {
        setAttendanceDate(new Date().toISOString().split('T')[0]);
        setAttendanceTime(getCurrentTime());
        setAttendanceNotes("");
        setShowAddAttendanceForm(true);
    };

    const closeAttendanceForm = () => {
        setShowAddAttendanceForm(false);
        setAttendanceNotes("");
    };

    const handleAddAttendance = () => {
        if (!member || !attendanceDate || addAttendanceMutation.isPending) return;

        const hasAttendanceForDate = memberAttendance?.some((attendance) =>
            attendance.date === attendanceDate || attendance.date.startsWith(attendanceDate)
        );
        if (hasAttendanceForDate) {
            toast({
                title: t('common.warning'),
                description: t('attendance.alreadyRecorded'),
            });
            return;
        }

        addAttendanceMutation.mutate({
            memberId: member.memberId,
            memberName: member.name,
            date: attendanceDate,
            checkIn: attendanceTime || undefined,
            notes: attendanceNotes.trim() ? attendanceNotes.trim() : undefined,
        });
    };

    const handleAddSubscription = () => {
        if (!member || !selectedPackageId) return;
        const pkg = packages?.find(p => p.id === selectedPackageId);
        if (!pkg) return;

        const startArr = startDate.split('-').map(Number);
        const start = new Date(startArr[0], startArr[1] - 1, startArr[2]);
        const end = addDays(start, pkg.duration);

        createSubscriptionMutation.mutate({
            memberId: member.id,
            memberName: member.name,
            planName: pkg.name,
            amount: pkg.price,
            startDate: startDate,
            endDate: end.toISOString().split('T')[0],
            status: "active",
            paymentMethod: paymentMethod,
            paymentStatus: paymentStatus
        });
    };

    const escapeHtml = (value: string) => {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    const formatDateSafe = (value?: string | null, pattern = "PPP") => {
        if (!value) return "-";
        try {
            return format(new Date(value), pattern, { locale: dir === "rtl" ? ar : enUS });
        } catch {
            return value;
        }
    };

    const formatMoney = (value?: number | null) => {
        if (value === null || value === undefined || Number.isNaN(value)) return "-";
        return value.toFixed(3);
    };

    const decodeSvgDataUrl = (dataUrl: string) => {
        const payload = dataUrl.split(",", 2)[1] || "";
        if (!payload) return "";
        if (dataUrl.includes(";base64,")) {
            return atob(payload);
        }
        try {
            return decodeURIComponent(payload);
        } catch {
            return "";
        }
    };

    const getSvgSize = (svgText: string) => {
        const widthMatch = svgText.match(/width=["']([\d.]+)(px)?["']/i);
        const heightMatch = svgText.match(/height=["']([\d.]+)(px)?["']/i);
        if (widthMatch && heightMatch) {
            return { width: Number(widthMatch[1]), height: Number(heightMatch[1]) };
        }
        const viewBoxMatch = svgText.match(/viewBox=["']([\d.\s,]+)["']/i);
        if (viewBoxMatch) {
            const parts = viewBoxMatch[1]
                .replace(/,/g, " ")
                .trim()
                .split(/\s+/)
                .map((value) => Number(value));
            if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
                return { width: parts[2], height: parts[3] };
            }
        }
        return { width: 256, height: 256 };
    };

    const rasterizeSvgDataUrl = async (dataUrl: string) => {
        return await new Promise<string>((resolve) => {
            const img = new Image();
            img.onload = () => {
                const svgText = decodeSvgDataUrl(dataUrl);
                const fallbackSize = getSvgSize(svgText);
                const width = img.naturalWidth || fallbackSize.width;
                const height = img.naturalHeight || fallbackSize.height;
                const canvas = document.createElement("canvas");
                canvas.width = width || 256;
                canvas.height = height || 256;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve("");
                    return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => resolve("");
            img.crossOrigin = "anonymous";
            img.src = dataUrl;
        });
    };

    const fetchImageAsDataUrl = async (url?: string | null) => {
        if (!url) return "";
        try {
            if (url.startsWith("data:")) {
                if (url.startsWith("data:image/svg")) {
                    return await rasterizeSvgDataUrl(url);
                }
                return url;
            }
            const response = await fetch(url, { mode: "cors", credentials: "omit" });
            if (!response.ok) return "";
            const blob = await response.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("Failed to read image"));
                reader.readAsDataURL(blob);
            });
            if (dataUrl.startsWith("data:image/svg")) {
                return await rasterizeSvgDataUrl(dataUrl);
            }
            return dataUrl;
        } catch {
            return "";
        }
    };

    const buildTableRowsHtml = (rows: string[][], columnCount: number, emptyText: string) => {
        if (!rows.length) {
            return `<tr><td colspan="${columnCount}" class="empty">${escapeHtml(emptyText)}</td></tr>`;
        }
        return rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell || "-")}</td>`).join("")}</tr>`)
            .join("");
    };

    const buildMemberReport = async (options?: { includePrintScript?: boolean }) => {
        if (!member) return null;
        const includePrintScript = options?.includePrintScript ?? false;

        const [subscriptions, beltsEarned, attendanceRecords, sales] = await Promise.all([
            memberSubscriptions ? Promise.resolve(memberSubscriptions) : getSubscriptionsByMember(member.id),
            memberBelts ? Promise.resolve(memberBelts) : getMemberBelts(member.id),
            memberAttendance ? Promise.resolve(memberAttendance) : getAttendanceByMember([member.memberId, member.id].filter(Boolean)),
            memberSales ? Promise.resolve(memberSales) : getSalesByMember(member.id),
        ]);

        const svgIcon = (body: string) => `
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="svg-icon">
                    ${body}
                </svg>
            `;
        const icons = {
            report: svgIcon(`
                    <path d="M6 2h8l4 4v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
                    <path d="M14 2v4h4"></path>
                    <path d="M8 12h8M8 16h8"></path>
                `),
            user: svgIcon(`
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M4 20c2-4 6-6 8-6s6 2 8 6"></path>
                `),
            id: svgIcon(`
                    <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                    <circle cx="8.5" cy="10" r="2"></circle>
                    <path d="M13 9h6M13 13h6M7 16h12"></path>
                `),
            phone: svgIcon(`
                    <rect x="7" y="2" width="10" height="20" rx="2"></rect>
                    <circle cx="12" cy="18" r="1"></circle>
                `),
            mail: svgIcon(`
                    <rect x="3" y="6" width="18" height="12" rx="2"></rect>
                    <path d="M3 7l9 6 9-6"></path>
                `),
            calendar: svgIcon(`
                    <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                    <path d="M8 3v4M16 3v4M3 11h18"></path>
                `),
            height: svgIcon(`
                    <path d="M12 3v18"></path>
                    <path d="M8 7l4-4 4 4"></path>
                    <path d="M8 17l4 4 4-4"></path>
                `),
            weight: svgIcon(`
                    <rect x="4" y="6" width="16" height="12" rx="2"></rect>
                    <path d="M8 10h8"></path>
                    <circle cx="12" cy="13" r="2"></circle>
                `),
            blood: svgIcon(`
                    <path d="M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z"></path>
                `),
            belt: svgIcon(`
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M8 12l-2 8 6-3 6 3-2-8"></path>
                `),
            suit: svgIcon(`
                    <path d="M8 4l4 2 4-2 4 4-3 2v10H7V10L4 8l4-4z"></path>
                `),
            status: svgIcon(`
                    <path d="M12 3l7 3v6c0 5-3.5 9-7 9s-7-4-7-9V6l7-3z"></path>
                    <path d="M9 12l2 2 4-4"></path>
                `),
            health: svgIcon(`
                    <path d="M12 21s-7-4.35-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.65-7 9-7 9z"></path>
                `),
            subscriptions: svgIcon(`
                    <rect x="7" y="3" width="10" height="4" rx="1"></rect>
                    <rect x="5" y="7" width="14" height="14" rx="2"></rect>
                    <path d="M8 12h8M8 16h8"></path>
                `),
            attendance: svgIcon(`
                    <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                    <path d="M8 3v4M16 3v4M3 11h18"></path>
                    <path d="M9 16l2 2 4-4"></path>
                `),
            sales: svgIcon(`
                    <path d="M6 7h12l-1 13H7L6 7z"></path>
                    <path d="M9 7V5a3 3 0 0 1 6 0v2"></path>
                `),
            amount: svgIcon(`
                    <rect x="3" y="6" width="18" height="12" rx="2"></rect>
                    <path d="M3 10h18"></path>
                    <path d="M7 16h4"></path>
                `),
            time: svgIcon(`
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 7v5l3 3"></path>
                `),
            notes: svgIcon(`
                    <path d="M6 3h9l3 3v15H6z"></path>
                    <path d="M15 3v3h3"></path>
                    <path d="M8 11h8M8 15h8"></path>
                `),
            product: svgIcon(`
                    <path d="M3 7l9-4 9 4-9 4-9-4z"></path>
                    <path d="M3 7v10l9 4 9-4V7"></path>
                    <path d="M12 11v10"></path>
                `),
            quantity: svgIcon(`
                    <path d="M5 9h14M4 15h14M9 4l-2 16M15 4l-2 16"></path>
                `),
            check: svgIcon(`
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M8 12l2 2 4-4"></path>
                `),
            checkSimple: svgIcon(`
                    <path d="M20 6L9 17L4 12"></path>
                `),
        };

        const defaultLogoUrl = ""; // No local fallback
        const legacyLogoUrl = clubSettings?.logoUrl && clubSettings.logoUrl !== "/logo_dark_icon.svg"
            ? clubSettings.logoUrl
            : "";
        const logoUrl = clubSettings?.logoUrlLight || legacyLogoUrl || clubSettings?.logoUrlDark || defaultLogoUrl;
        const clubName = clubSettings?.name || "Club Manager";
        const memberInitials = member.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("");
        const reportDate = formatDateSafe(new Date().toISOString(), "PPP");
        const reportIdentifier = member.memberId || member.id;
        const reportFileName = `member-report-${reportIdentifier}-${new Date().toISOString().slice(0, 10)}`;
        const reportFileNameJs = JSON.stringify(reportFileName);

        const statusLabel = memberSubscriptionStatus === "active"
            ? t('common.active')
            : memberSubscriptionStatus === "aboutToExpire"
                ? t('common.aboutToExpire')
                : memberSubscriptionStatus === "inactive"
                    ? t('common.inactive')
                    : t('common.expired');

        const detailItems = [
            { label: t('members.memberId'), value: member.memberId, icon: icons.id },
            { label: t('members.phone'), value: member.phone || "-", icon: icons.phone },
            { label: t('members.email'), value: member.email || "-", icon: icons.mail },
            { label: t('members.dob'), value: member.dob ? formatDateSafe(member.dob) : "-", icon: icons.calendar },
            { label: t('members.gender'), value: member.gender ? (member.gender === "male" ? t('members.male') : t('members.female')) : "-", icon: icons.user },
            { label: t('members.height'), value: member.height || "-", icon: icons.height },
            { label: t('members.weight'), value: member.weight || "-", icon: icons.weight },
            { label: t('members.bloodType'), value: member.bloodType || "-", icon: icons.blood },
            { label: t('members.belt'), value: member.beltSize || "-", icon: icons.belt },
            { label: t('members.suitSize'), value: member.suitSize || "-", icon: icons.suit },
            { label: t('subscriptions.startDate'), value: member.subscriptionStart ? formatDateSafe(member.subscriptionStart) : "-", icon: icons.calendar },
            { label: t('subscriptions.endDate'), value: member.subscriptionEnd ? formatDateSafe(member.subscriptionEnd) : "-", icon: icons.calendar },
            { label: t('members.status'), value: statusLabel, icon: icons.status },
        ];
        const detailItemsPlain = detailItems.map(({ label, value }) => ({ label, value }));

        const beltsData = beltsEarned
            .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime())
            .map((beltAward) => {
                const belt = belts?.find((item) => item.id === beltAward.beltId);
                return [belt?.name || "-", formatDateSafe(beltAward.awardedAt)];
            });

        const subscriptionsData = subscriptions
            .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""))
            .map((subscription) => ([
                subscription.planName || "-",
                formatDateSafe(subscription.startDate),
                formatDateSafe(subscription.endDate),
                `${formatMoney(subscription.amount)} ${t("common.currency")}`,
                subscription.status || "-",
                subscription.paymentStatus || "-",
            ]));

        const attendanceData = attendanceRecords.map((attendance) => ([
            formatDateSafe(attendance.date),
            attendance.checkIn || "-",
            attendance.checkOut || "-",
            attendance.notes || "-",
        ]));

        const salesData = sales
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .map((sale) => ([
                formatDateSafe(sale.date, "PPP"),
                sale.productName || "-",
                String(sale.quantity || 0),
                `${formatMoney(sale.totalPrice)} ${t("common.currency")}`,
                sale.paymentStatus ? t(`common.${sale.paymentStatus}`) : "-",
            ]));

        const healthNotesText = member.healthNotes && member.healthNotes.trim()
            ? member.healthNotes
            : t('common.noResults');
        const healthNotes = escapeHtml(healthNotesText);

        // Financial calculations
        const subPaid = subscriptions.filter(s => s.paymentStatus === "paid").reduce((sum, s) => sum + (s.amount || 0), 0);
        const subUnpaid = subscriptions.filter(s => s.paymentStatus !== "paid").reduce((sum, s) => sum + (s.amount || 0), 0);
        const salesPaid = sales.filter(s => s.paymentStatus === "paid").reduce((sum, s) => sum + (s.totalPrice || 0), 0);
        const salesUnpaid = sales.filter(s => s.paymentStatus !== "paid").reduce((sum, s) => sum + (s.totalPrice || 0), 0);

        const totalSpent = sales.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);
        const statusClass = memberSubscriptionStatus || "inactive";
        const logoHtml = logoUrl
            ? `<img src="${logoUrl}" class="logo-img" />`
            : `<div class="logo-img logo-placeholder">${icons.report}</div>`;
        const summaryCards = [
            { label: t('subscriptions.title'), value: String(subscriptions.length), icon: icons.subscriptions },
            { label: t('nav.belts'), value: String(beltsEarned.length), icon: icons.belt },
            { label: t('nav.attendance'), value: String(attendanceRecords.length), icon: icons.attendance },
            { label: t('sales.total'), value: `${formatMoney(totalSpent)} ${t("common.currency")}`, icon: icons.amount },
        ];
        const summaryCardsPlain = summaryCards.map(({ label, value }) => ({ label, value }));

        const tableSections = [
            {
                key: "subscriptions",
                title: t('subscriptions.history'),
                columns: [
                    t('subscriptions.planName'),
                    t('subscriptions.startDate'),
                    t('subscriptions.endDate'),
                    t('common.amount'),
                    t('members.status'),
                    t('subscriptions.paymentStatus'),
                ],
                rows: subscriptionsData,
                emptyText: t('common.noResults'),
            },
            {
                key: "belts",
                title: t('nav.belts'),
                columns: [t('belts.beltName'), t('common.date')],
                rows: beltsData,
                emptyText: t('common.noResults'),
            },
            {
                key: "attendance",
                title: t('attendance.attendanceHistory'),
                columns: [t('common.date'), t('attendance.checkIn'), t('attendance.checkOut'), t('common.notes')],
                rows: attendanceData,
                emptyText: t('attendance.noAttendance'),
            },
            {
                key: "sales",
                title: t('sales.purchaseHistory'),
                columns: [t('common.date'), t('sales.product'), t('sales.quantity'), t('common.amount'), t('subscriptions.paymentStatus')],
                rows: salesData,
                emptyText: t('common.noResults'),
            },
        ];

        const beltChain = (belts || [])
            .sort((a, b) => a.order - b.order)
            .map(belt => {
                const earned = beltsEarned.find(be => be.beltId === belt.id);
                return {
                    id: belt.id,
                    name: belt.name,
                    color: belt.color,
                    isEarned: !!earned,
                    awardedAt: earned ? formatDateSafe(earned.awardedAt) : undefined
                };
            });

        const reportData: MemberReportData = {
            isRtl: dir === "rtl",
            reportTitle: t('members.report'),
            clubName,
            logoUrl,
            reportDate,
            reportFileName,
            labels: {
                date: t('common.date'),
                memberId: t('members.memberId'),
                phone: t('members.phone'),
                email: t('members.email'),
                cpr: t('members.cpr'),
                subscriptionEnd: t('subscriptions.endDate'),
                dob: t('members.dob'),
                gender: t('members.gender'),
            },
            sectionTitles: {
                personalInfo: t('members.personalInfo'),
                healthNotes: t('members.healthNotes'),
                contactInfo: t('members.contactInfo'),
                belts: t('nav.belts'),
            },
            member: {
                name: member.name,
                memberId: member.memberId,
                cpr: member.cpr || "-",
                phone: member.phone || "-",
                email: member.email || "-",
                dob: member.dob ? formatDateSafe(member.dob) : "-",
                gender: member.gender ? (member.gender === "male" ? t('members.male') : t('members.female')) : "-",
                imageUrl: member.imageUrl || "",
                subscriptionEnd: member.subscriptionEnd ? formatDateSafe(member.subscriptionEnd) : "-",
            },
            memberInitials,
            status: statusClass,
            statusLabel,
            summaryCards: summaryCardsPlain,
            healthNotes: healthNotesText,
            tableSections: tableSections.map((section) => ({
                title: section.title,
                columns: section.columns,
                rows: section.rows,
                emptyText: section.emptyText,
            })),
            beltChain,
            financials: {
                subPaid,
                subUnpaid,
                salesPaid,
                salesUnpaid,
                totalPaidLabel: t('finance.totalPaid'),
                totalUnpaidLabel: t('finance.totalUnpaid')
            }
        };

        const tableRowsByKey = Object.fromEntries(
            tableSections.map((section) => [
                section.key,
                buildTableRowsHtml(section.rows, section.columns.length, section.emptyText),
            ])
        );
        const subscriptionsRows = tableRowsByKey.subscriptions;
        const beltsRows = tableRowsByKey.belts;
        const attendanceRows = tableRowsByKey.attendance;
        const salesRows = tableRowsByKey.sales;

        const printScript = includePrintScript
            ? `
                        <script>
                            window.onload = () => {
                                document.title = ${reportFileNameJs};
                                setTimeout(() => {
                                    window.print();
                                }, 300);
                            };
                            window.onafterprint = () => {
                                window.close();
                            };
                        </script>
                    `
            : "";

        const reportHtml = `
                <html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}">
                    <head>
                        <meta charset="UTF-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
                        <title>${escapeHtml(reportFileName)}</title>
                        <style>
                            @page { size: auto; margin: 25mm 0 0 0 !important; }
                            @page :first { margin-top: 0mm !important; }
                            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            :root {
                                --primary: #1e293b;
                                --accent: #3b82f6;
                                --ink: #0f172a;
                                --ink-light: #64748b;
                                --border: #e2e8f0;
                                --surface: #ffffff;
                                --surface-alt: #f8fafc;
                                --danger: #ef4444;
                            }
                            body {
                                margin: 0 15mm 15mm 15mm;
                                padding: 0;
                                font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
                                color: var(--ink);
                                background: #fff;
                                line-height: 1.5;
                                font-size: 11pt;
                            }
                            .report-container { width: 100%; max-width: 100%; margin: 0 auto; }
                                                        /* Professional Header */
                            .header { 
                                display: flex; 
                                background: var(--primary);
                                color: white;
                                padding: 25px 15mm;
                                margin: 0 -15mm 10mm -15mm;
                                align-items: flex-end;
                                border-bottom: none;
                            }
                            .brand { display: flex; align-items: center; gap: 15px; flex: 1; }
                            .logo-img { height: 40px !important; width: auto !important; max-width: 130px !important; object-fit: contain !important; filter: brightness(0) invert(1); }
                            .brand-text h1 { font-size: 20pt; margin: 0; color: white !important; font-weight: 700; line-height: 1; }
                            .brand-text p { font-size: 9pt; margin: 4px 0 0; color: rgba(255,255,255,0.8) !important; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
                            .meta { text-align: ${dir === "rtl" ? "left" : "right"}; font-size: 9pt; color: rgba(255,255,255,0.9) !important; line-height: 1.4; }
                            .meta-item { margin-bottom: 2px; }

                            /* Footer */
                            .footer {
                                background: var(--primary);
                                color: white;
                                padding: 15px 15mm;
                                margin: 50px -15mm 0 -15mm;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                font-size: 8pt;
                                border-radius: 0 0 4px 4px;
                            }
                            .footer-text { opacity: 0.8; }

                            .footer-text { opacity: 0.8; }

                            /* Content Layout */
                            .report-grid { display: flex; gap: 40px; margin-bottom: 40px; }
                            .side-col { width: 33%; }
                            .main-col { width: 67%; }
                            
                            /* Profile Card */
                            .profile-card { 
                                background: var(--surface-alt); 
                                border: 1px solid var(--border);
                                border-radius: 12px; 
                                padding: 20px 15px; 
                                text-align: center;
                                margin-bottom: 20px;
                            }
                            .profile-img { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 4px solid #fff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin: 0 auto 12px; }
                            .placeholder-img { width: 110px; height: 110px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 32pt; font-weight: 700; margin: 0 auto 12px; border: 4px solid #fff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                            .member-name { font-size: 14pt; font-weight: 700; margin-bottom: 4px; color: var(--primary); }
                            .member-id { font-size: 9pt; color: var(--ink-light); margin-bottom: 12px; font-weight: 600; }
                            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; }
                            .status-active { background: #dcfce7; color: #166534; }
                            .status-expired { background: #fee2e2; color: #991b1b; }

                            .contact-list { margin-top: 20px; text-align: ${dir === "rtl" ? "right" : "left"}; border-top: 1px solid var(--border); padding-top: 15px; }
                            .contact-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 10pt; color: var(--ink); }
                            .contact-icon { color: var(--accent); }

                            /* Data Sections */
                            .section-group { margin-bottom: 30px; }
                            .section-title { 
                                display: flex; 
                                align-items: center; 
                                gap: 10px; 
                                font-size: 11pt; 
                                font-weight: 700; 
                                color: var(--primary); 
                                border-inline-start: 4px solid var(--accent);
                                padding-inline-start: 12px;
                                margin-bottom: 15px;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            }
                            
                            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                            .data-card { 
                                background: var(--surface); 
                                border: 1px solid var(--border); 
                                border-radius: 8px; 
                                padding: 10px 12px; 
                                transition: all 0.2s;
                            }
                            .data-label { font-size: 8pt; color: var(--ink-light); text-transform: uppercase; font-weight: 700; margin-bottom: 2px; opacity: 0.8; }
                            .data-value { font-size: 10pt; font-weight: 700; color: var(--ink); }

                            /* Finance Summary */
                            .finance-summary { 
                                display: flex; 
                                justify-content: flex-end; 
                                gap: 20px; 
                                margin-top: 10px; 
                                padding: 12px;
                                background: var(--surface-alt);
                                border-radius: 8px;
                                border: 1px solid var(--border);
                            }
                            .finance-item { text-align: right; }
                            .finance-label { font-size: 7.5pt; color: var(--ink-light); text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
                            .finance-value { font-size: 10pt; font-weight: 700; color: var(--primary); }
                            .finance-value.paid { color: #166534; }
                            .finance-value.unpaid { color: #991b1b; }



                            /* Belt Chain Section */
                            .belt-chain-section { 
                                background: #f8fafc; 
                                border: 1px solid var(--border); 
                                border-radius: 16px; 
                                padding: 25px; 
                                margin: 40px 0;
                                page-break-inside: avoid;
                            }
                            .belt-chain-title { font-size: 16pt; font-weight: 700; color: var(--primary); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
                            .belt-table { width: 100%; table-layout: fixed; border-spacing: 0; }
                            .belt-circle { border: 3px solid #fff; outline: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }

                            /* History Tables */
                            .table-section { margin-bottom: 40px; page-break-inside: avoid; }
                            .full-width-table { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; border-radius: 12px; border: 1px solid var(--border); }
                            .full-width-table th { background: #f8fafc; padding: 14px 18px; text-align: ${dir === "rtl" ? "right" : "left"}; font-size: 9pt; font-weight: 700; color: var(--ink-light); text-transform: uppercase; border-bottom: 2px solid var(--border); letter-spacing: 0.5px; }
                            .full-width-table td { padding: 12px 18px; border-bottom: 1px solid var(--border); font-size: 10pt; color: var(--ink); }
                            .full-width-table tr:last-child td { border-bottom: none; }
                            .full-width-table tr:nth-child(even) { background: #fafafa; }

                            .note-box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 15px; font-size: 10pt; color: #92400e; margin-top: 10px; line-height: 1.6; }
                            .svg-icon { width: 18px; height: 18px; vertical-align: middle; fill: currentColor; }
                            
                            @media print {
                                body { padding: 10mm; background: white; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="report-container">
                            <header class="header">
                                <div class="brand">
                                    ${logoHtml}
                                    <div class="brand-text">
                                        <h1>${escapeHtml(clubName)}</h1>
                                        <p>${escapeHtml(t('members.report'))}</p>
                                    </div>
                                </div>
                                <div class="meta">
                                    <div class="meta-item">${escapeHtml(t('common.date'))}: ${escapeHtml(reportDate)}</div>
                                    <div class="meta-item">${escapeHtml(t('members.memberId'))}: #${escapeHtml(member.memberId)}</div>
                                </div>
                            </header>

                            <div class="report-grid">
                                <div class="side-col">
                                    <div class="profile-card">
                                        ${member.imageUrl ?
                `<img src="${member.imageUrl}" class="profile-img" />` :
                `<div class="placeholder-img">${escapeHtml(memberInitials || "M")}</div>`
            }
                                        <div class="member-name">${escapeHtml(member.name)}</div>
                                        <div class="member-id">#${escapeHtml(member.memberId)}</div>
                                        
                                        <div class="status-badge ${statusClass}">
                                            ${escapeHtml(statusLabel)}
                                        </div>

                                        <div class="contact-list">
                                            <div class="contact-item">
                                                <div class="contact-icon">${icons.phone}</div>
                                                <span dir="ltr">${escapeHtml(member.phone || "-")}</span>
                                            </div>
                                            <div class="contact-item">
                                                <div class="contact-icon">${icons.mail}</div>
                                                <span>${escapeHtml(member.email || "-")}</span>
                                            </div>
                                            <div class="contact-item" style="margin-top: 10px; border-top: 1px dashed var(--border); padding-top: 10px;">
                                                <div class="contact-icon">${icons.calendar}</div>
                                                <span style="font-size: 8.5pt;">${escapeHtml(t('subscriptions.endDate'))}: ${escapeHtml(member.subscriptionEnd ? formatDateSafe(member.subscriptionEnd) : "-")}</span>
                                            </div>
                                            </div>
                                        </div>
                                    </div>

                                <div class="main-col">
                                        <div class="section-group">
                                            <div class="section-title">
                                                ${icons.user} ${escapeHtml(t('members.personalInfo'))}
                                            </div>
                                            <div class="info-grid">
                                                ${detailItems.map(item => `
                                                    <div class="data-card">
                                                        <div class="data-label">${escapeHtml(item.label)}</div>
                                                        <div class="data-value">${escapeHtml(item.value)}</div>
                                                    </div>
                                                `).join("")}
                                            </div>
                                        </div>

                                        <div class="section-group">
                                            <div class="section-title">
                                                ${icons.chart} ${escapeHtml(t('dashboard.statsReport'))}
                                            </div>
                                            <div class="info-grid">
                                                ${summaryCards.map(card => `
                                                    <div class="data-card">
                                                        <div class="data-label">${escapeHtml(card.label)}</div>
                                                        <div class="data-value">${escapeHtml(card.value)}</div>
                                                    </div>
                                                `).join("")}
                                            </div>
                                        </div>

                                        ${healthNotesText && healthNotesText !== '-' ? `
                                            <div class="section-group">
                                                <div class="section-title">
                                                    ${icons.health} ${escapeHtml(t('members.healthNotes'))}
                                                </div>
                                                <div class="note-box">${healthNotes}</div>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>

                                <div class="belt-chain-section">
                                    <div class="belt-chain-title">
                                        ${icons.belt} الأحزمة
                                    </div>
                                    <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid var(--border);">
                                        <table class="belt-table">
                                            ${(() => {
                const totalBelts = beltChain.length;
                let itemsPerRow = 5;
                let circleSize = 44;

                if (totalBelts > 10) { itemsPerRow = 6; circleSize = 40; }
                if (totalBelts > 15) { itemsPerRow = 8; circleSize = 34; }
                if (totalBelts > 20) { itemsPerRow = 10; circleSize = 30; }

                const rowWidth = 100 / itemsPerRow;
                const rows = [];
                for (let i = 0; i < beltChain.length; i += itemsPerRow) {
                    rows.push(beltChain.slice(i, i + itemsPerRow));
                }
                return rows.map((row) => `
                                                    <tr>
                                                        ${row.map(belt => `
                                                            <td style="width: ${rowWidth}%; padding: 10px 4px; vertical-align: top; text-align: center;">
                                                                <div class="belt-circle" style="width: ${circleSize}px !important; height: ${circleSize}px !important; min-width: ${circleSize}px !important; max-width: ${circleSize}px !important; min-height: ${circleSize}px !important; max-height: ${circleSize}px !important; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; background-color: ${belt.isEarned ? belt.color : '#e2e8f0'}; border: 2px solid ${belt.isEarned ? 'rgba(0,0,0,0.1)' : '#cbd5e1'};">
                                                                    ${belt.isEarned ? `<span style="color: white; font-weight: bold; font-size: ${circleSize > 34 ? 14 : 10}px;">✓</span>` : '&nbsp;'}
                                                                </div>
                                                                <div style="font-size: ${circleSize > 34 ? 10 : 8.5}px; font-weight: 700; color: var(--primary); line-height: 1.2;">
                                                                    ${escapeHtml(belt.name)}
                                                                </div>
                                                                ${belt.awardedAt ? `<div style="font-size: 8px; color: var(--ink-light); margin-top: 2px;">${escapeHtml(belt.awardedAt)}</div>` : ''}
                                                            </td>
                                                        `).join("")}
                                                        ${/* Fill empty cells */ row.length < itemsPerRow ? Array.from({ length: itemsPerRow - row.length }).map(() => `<td style="width: ${rowWidth}%;"></td>`).join("") : ""}
                                                    </tr>
                                                `).join("");
            })()}
                                        </table>
                                    </div>
                                </div>

                                <div class="table-section">
                                    <div class="section-title">${icons.subscriptions} ${escapeHtml(t('subscriptions.history'))}</div>
                                    <table class="full-width-table">
                                        <thead>
                                            <tr>
                                                <th>${escapeHtml(t('subscriptions.planName'))}</th>
                                                <th>${escapeHtml(t('subscriptions.startDate'))}</th>
                                                <th>${escapeHtml(t('subscriptions.endDate'))}</th>
                                                <th>${escapeHtml(t('common.amount'))}</th>
                                                <th>${escapeHtml(t('members.status'))}</th>
                                                <th>${escapeHtml(t('subscriptions.paymentStatus'))}</th>
                                            </tr>
                                        </thead>
                                        <tbody>${subscriptionsRows}</tbody>
                                    </table>
                                    <div class="finance-summary">
                                        <div class="finance-item">
                                            <div class="finance-label">${escapeHtml(t('finance.totalPaid'))}</div>
                                            <div class="finance-value paid">${formatMoney(subPaid)} ${escapeHtml(t("common.currency"))}</div>
                                        </div>
                                        <div class="finance-item">
                                            <div class="finance-label">${escapeHtml(t('finance.totalUnpaid'))}</div>
                                            <div class="finance-value unpaid">${formatMoney(subUnpaid)} ${escapeHtml(t("common.currency"))}</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="table-section">
                                    <div class="section-title">${icons.sales} ${escapeHtml(t('sales.purchaseHistory'))}</div>
                                    <table class="full-width-table">
                                        <thead>
                                            <tr>
                                                <th>${escapeHtml(t('common.date'))}</th>
                                                <th>${escapeHtml(t('sales.product'))}</th>
                                                <th>${escapeHtml(t('sales.quantity'))}</th>
                                                <th>${escapeHtml(t('common.amount'))}</th>
                                                <th>${escapeHtml(t('subscriptions.paymentStatus'))}</th>
                                            </tr>
                                        </thead>
                                        <tbody>${salesRows}</tbody>
                                    </table>
                                    <div class="finance-summary">
                                        <div class="finance-item">
                                            <div class="finance-label">${escapeHtml(t('finance.totalPaid'))}</div>
                                            <div class="finance-value paid">${formatMoney(salesPaid)} ${escapeHtml(t("common.currency"))}</div>
                                        </div>
                                        <div class="finance-item">
                                            <div class="finance-label">${escapeHtml(t('finance.totalUnpaid'))}</div>
                                            <div class="finance-value unpaid">${formatMoney(salesUnpaid)} ${escapeHtml(t("common.currency"))}</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="table-section">
                                    <div class="section-title">${icons.attendance} ${escapeHtml(t('attendance.attendanceHistory'))}</div>
                                    <table class="full-width-table">
                                        <thead>
                                            <tr>
                                                <th>${escapeHtml(t('common.date'))}</th>
                                                <th>${escapeHtml(t('attendance.checkIn'))}</th>
                                                <th>${escapeHtml(t('attendance.checkOut'))}</th>
                                                <th>${escapeHtml(t('common.notes'))}</th>
                                            </tr>
                                        </thead>
                                        <tbody>${attendanceRows}</tbody>
                                    </table>
                                </div>

                                </div>
                            </div>
                            <footer class="footer">
                                <div class="footer-text">${escapeHtml(clubName)} - ${escapeHtml(t('members.report'))}</div>
                                <div class="footer-text">${escapeHtml(reportDate)}</div>
                            </footer>
                            ${printScript}
                        </body>
                    </html>
                `;

        return { reportHtml, reportFileName, reportData };
    };

    const handleGenerateReport = async () => {
        if (!member) return;
        const reportWindow = window.open("", "", "width=900,height=1100");
        if (!reportWindow) {
            toast({ variant: "destructive", title: t('common.error'), description: "Pop-up blocked" });
            return;
        }

        reportWindow.document.write(`<p style="font-family: Arial, sans-serif; padding: 24px;">${escapeHtml(t('common.loading'))}</p>`);
        setIsGeneratingReport(true);

        try {
            const reportPayload = await buildMemberReport({ includePrintScript: true });
            if (!reportPayload) return;

            reportWindow.document.open();
            reportWindow.document.write(reportPayload.reportHtml);
            reportWindow.document.close();
        } catch (error: any) {
            reportWindow.document.open();
            reportWindow.document.write(`<p style="font-family: Arial, sans-serif; padding: 24px;">${escapeHtml(t('common.error'))}</p>`);
            reportWindow.document.close();
            toast({ variant: "destructive", title: t('common.error'), description: error?.message || "Failed to generate report" });
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleDownloadReportPdf = async () => {
        if (!member) return;
        setIsDownloadingReport(true);

        try {
            const reportPayload = await buildMemberReport();
            if (!reportPayload) return;
            const [logoDataUrl, memberImageDataUrl] = await Promise.all([
                fetchImageAsDataUrl(reportPayload.reportData.logoUrl),
                fetchImageAsDataUrl(reportPayload.reportData.member.imageUrl),
            ]);
            const reportData = {
                ...reportPayload.reportData,
                logoUrl: logoDataUrl || reportPayload.reportData.logoUrl,
                member: {
                    ...reportPayload.reportData.member,
                    imageUrl: memberImageDataUrl || reportPayload.reportData.member.imageUrl,
                },
            };
            const blob = await pdf(<MemberReportPdf data={reportData} />).toBlob();
            saveAs(blob, `${reportPayload.reportFileName}.pdf`);
        } catch (error: any) {
            toast({ variant: "destructive", title: t('common.error'), description: error?.message || "Failed to generate report" });
        } finally {
            setIsDownloadingReport(false);
        }
    };

    // if (!member) return null; // Removed to support adding

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent dir={dir} className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden text-start">
                <DialogHeader className="sr-only">
                    <DialogTitle>{member?.name || t('members.addMember')}</DialogTitle>
                </DialogHeader>
                <div className="p-6 border-b bg-muted/10">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-2 border-primary">
                                <AvatarImage src={imagePreview || member?.imageUrl || undefined} className="object-contain" />
                                <AvatarFallback>{(member?.name || "M")[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold">{member?.name || t('members.addMember')}</h2>
                                    {member && memberSubscriptionStatus && (
                                        <Badge
                                            variant={
                                                memberSubscriptionStatus === "expired"
                                                    ? "destructive"
                                                    : memberSubscriptionStatus === "upcoming"
                                                        ? "outline"
                                                        : memberSubscriptionStatus === "aboutToExpire" || memberSubscriptionStatus === "inactive"
                                                            ? "secondary"
                                                            : "default"
                                            }
                                            className={memberSubscriptionStatus === "upcoming" ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/10 dark:text-blue-300" : ""}
                                        >
                                            {memberSubscriptionStatus === "active"
                                                ? t('common.active')
                                                : memberSubscriptionStatus === "aboutToExpire"
                                                    ? t('common.aboutToExpire')
                                                    : memberSubscriptionStatus === "inactive"
                                                        ? t('common.inactive')
                                                        : memberSubscriptionStatus === "upcoming"
                                                            ? t('common.upcoming')
                                                            : t('common.expired')}
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-muted-foreground flex gap-4 text-sm mt-1">
                                    {member && (
                                        <>
                                            <span>{t('members.memberId')}: <span className="font-mono text-foreground">{member.memberId}</span></span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        {member && (
                            <div className="flex gap-2 shrink-0">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleGenerateReport}
                                    disabled={isGeneratingReport || isDownloadingReport}
                                >
                                    {isGeneratingReport ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin me-2" />
                                            {t('common.loading')}
                                        </>
                                    ) : (
                                        <>
                                            <Printer className="h-4 w-4 me-2" />
                                            {t('members.report')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <Tabs dir={dir} value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b">
                        <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                            <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6 bg-transparent text-start">{t('members.personalInfo')}</TabsTrigger>
                            {member && (
                                <>
                                    <TabsTrigger value="subscriptions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6 bg-transparent text-start">{t('nav.subscriptions')}</TabsTrigger>
                                    <TabsTrigger value="belts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6 bg-transparent text-start">{t('nav.belts')}</TabsTrigger>
                                    <TabsTrigger value="attendance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6 bg-transparent text-start">{t('nav.attendance')}</TabsTrigger>
                                    <TabsTrigger value="finance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-6 bg-transparent text-start">{t('nav.finance')}</TabsTrigger>
                                </>
                            )}
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                        <TabsContent value="profile" className="m-0 space-y-6 text-start">
                            {isEditing ? (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <CardTitle className="text-start">{t('members.personalInfo')}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* Name Section */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="firstName">{t('members.firstName')} *</Label>
                                                    <Input
                                                        id="firstName"
                                                        value={formData.firstName || ""}
                                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="fatherName">{t('members.fatherName')} *</Label>
                                                    <Input
                                                        id="fatherName"
                                                        value={formData.fatherName || ""}
                                                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="lastName">{t('members.lastName')} *</Label>
                                                    <Input
                                                        id="lastName"
                                                        value={formData.lastName || ""}
                                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="cpr">{t('members.cpr')}</Label>
                                                    <Input
                                                        id="cpr"
                                                        value={formData.cpr || ""}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (/^\d{0,9}$/.test(val)) {
                                                                setFormData({ ...formData, cpr: val });
                                                            }
                                                        }}
                                                        placeholder="000000000"
                                                        maxLength={9}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="phone">{t('members.phone')} *</Label>
                                                    <Input
                                                        id="phone"
                                                        value={formData.phone}
                                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">{t('members.email')}</Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        value={formData.email || ""}
                                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>{t('members.dob')}</Label>
                                                    <Input
                                                        type="date"
                                                        value={formData.dob || ""}
                                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('members.gender')} *</Label>
                                                    <Select value={formData.gender} onValueChange={(val: any) => setFormData({ ...formData, gender: val })}>
                                                        <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="male">{t('members.male')}</SelectItem>
                                                            <SelectItem value="female">{t('members.female')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader><CardTitle className="text-start">{t('members.measurements')}</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('members.height')} (cm)</Label>
                                                <Input value={formData.height || ""} onChange={e => setFormData({ ...formData, height: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('members.weight')} (kg)</Label>
                                                <Input value={formData.weight || ""} onChange={e => setFormData({ ...formData, weight: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('members.bloodType')}</Label>
                                                <Select value={formData.bloodType || ""} onValueChange={v => setFormData({ ...formData, bloodType: v })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('members.age')} *</Label>
                                                <Input type="number" value={formData.age || ""} onChange={e => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : undefined })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('members.suitSize')}</Label>
                                                <Input value={formData.suitSize || ""} onChange={e => setFormData({ ...formData, suitSize: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('members.beltSize')}</Label>
                                                <Input value={formData.beltSize || ""} onChange={e => setFormData({ ...formData, beltSize: e.target.value })} />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader><CardTitle className="text-start">{t('members.healthNotes')}</CardTitle></CardHeader>
                                        <CardContent>
                                            <Textarea
                                                value={formData.healthNotes || ""}
                                                onChange={e => setFormData({ ...formData, healthNotes: e.target.value })}
                                                placeholder={t('members.healthNotesPlaceholder')}
                                                rows={3}
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader><CardTitle className="text-start">{t('members.profileImage')}</CardTitle></CardHeader>
                                        <CardContent className="flex items-center gap-4">
                                            <Avatar className="h-20 w-20">
                                                <AvatarImage src={imagePreview || ""} className="object-contain" />
                                                <AvatarFallback><Plus className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                                                <p className="text-[10px] text-muted-foreground mt-1">{t('members.imageUploadHint')}</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>{t('common.cancel')}</Button>
                                        <Button type="submit" disabled={createMemberMutation.isPending || updateMemberMutation.isPending}>
                                            {(createMemberMutation.isPending || updateMemberMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {t('common.save')}
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                member && (
                                    <>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <CardTitle className="text-start">{t('members.personalInfo')}</CardTitle>
                                                {hasPermission(PERMISSIONS.MEMBERS_UPDATE) && (
                                                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
                                                        <Pencil className="h-4 w-4" />
                                                        {t('common.edit')}
                                                    </Button>
                                                )}
                                            </CardHeader>
                                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-start">
                                                <div className="space-y-1 text-start"><Label>{t('members.cpr')}</Label><div className="font-medium text-start">{member.cpr || "-"}</div></div>
                                                <div className="space-y-1 text-start">
                                                    <Label>{t('members.phone')}</Label>
                                                    <button
                                                        type="button"
                                                        className="font-medium text-start text-primary hover:underline"
                                                        onClick={() => setIsWhatsAppDialogOpen(true)}
                                                    >
                                                        <span dir="ltr">{member.phone}</span>
                                                    </button>
                                                </div>
                                                <div className="space-y-1 text-start"><Label>{t('members.email')}</Label><div className="font-medium text-start">{member.email || "-"}</div></div>
                                                <div className="space-y-1 text-start"><Label>{t('members.dob')}</Label><div className="font-medium text-start">{member.dob || "-"}</div></div>
                                                <div className="space-y-1 text-start"><Label>{t('members.gender')}</Label><div className="font-medium text-start">{member.gender === 'male' ? t('members.male') : t('members.female')}</div></div>
                                                <div className="space-y-1 text-start"><Label>{t('members.bloodType')}</Label><div className="font-medium text-start">{member.bloodType || "-"}</div></div>
                                                <div className="space-y-1 text-start"><Label>{t('members.address')}</Label><div className="font-medium text-start">{"-"}</div></div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader><CardTitle className="text-start">{t('members.measurements')}</CardTitle></CardHeader>
                                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 text-start">
                                                <div className="space-y-1 text-start"><Label>{t('members.height')}</Label><div className="font-medium text-start">{member.height || "-"}</div></div>
                                                <div className="space-y-1 text-start"><Label>{t('members.weight')}</Label><div className="font-medium text-start">{member.weight || "-"}</div></div>
                                                <div className="space-y-1 text-start"><Label>{t('members.suitSize')}</Label><div className="font-medium text-start">{member.suitSize || "-"}</div></div>
                                                <div className="space-y-1 text-start"><Label>{t('members.belt')}</Label><div className="font-medium text-start">{member.beltSize || "-"}</div></div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader><CardTitle className="text-start">{t('members.healthNotes')}</CardTitle></CardHeader>
                                            <CardContent>
                                                <div className="text-sm p-3 bg-muted rounded-md min-h-[60px] whitespace-pre-wrap text-start">
                                                    {member.healthNotes || t('common.noResults')}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <CardTitle className="text-start">{t("members.documents")}</CardTitle>
                                                {hasPermission(PERMISSIONS.MEMBERS_UPDATE) && (
                                                    <div>
                                                        <input
                                                            key={documentInputKey}
                                                            type="file"
                                                            multiple
                                                            className="hidden"
                                                            ref={fileInputRef}
                                                            onChange={handleDocumentSelection}
                                                            disabled={isUploadingDocuments}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            disabled={isUploadingDocuments}
                                                        >
                                                            {isUploadingDocuments ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Upload className="h-4 w-4 me-2" />}
                                                            {t("members.uploadDocuments")}
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardHeader>
                                            <CardContent>
                                                {pendingDocuments.length > 0 && (
                                                    <div className="mb-4 space-y-3 rounded-lg border border-dashed p-3 bg-muted/20">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="text-sm font-medium">
                                                                {t("members.pendingUploadCount").replace("{count}", String(pendingDocuments.length))}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={handleUploadPendingDocuments}
                                                                    disabled={isUploadingDocuments}
                                                                >
                                                                    {isUploadingDocuments ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Upload className="h-4 w-4 me-2" />}
                                                                    {t("members.uploadDocuments")}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setPendingDocuments([])}
                                                                    disabled={isUploadingDocuments}
                                                                >
                                                                    {t('common.cancel')}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {pendingDocuments.map((entry, idx) => (
                                                                <div key={`${entry.file.name}-${idx}`} className="rounded-md border p-3 space-y-2 bg-background">
                                                                    <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                                                                        <span className="truncate">{entry.file.name}</span>
                                                                        <span>{(entry.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <Label className="text-xs">{t("common.label")}</Label>
                                                                        <Input
                                                                            value={entry.label}
                                                                            onChange={(e) => {
                                                                                const next = [...pendingDocuments];
                                                                                next[idx] = { ...next[idx], label: e.target.value };
                                                                                setPendingDocuments(next);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {member.documents?.map((doc, idx) => (
                                                        <div key={idx} className="border rounded-md p-2 relative group">
                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block text-start">
                                                                {doc.type.startsWith('image/') ? (
                                                                    <div className="aspect-square bg-muted rounded overflow-hidden">
                                                                        <img src={doc.url} className="w-full h-full object-cover" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="aspect-square bg-muted rounded flex items-center justify-center">
                                                                        <FileText className="h-10 w-10 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                <div className="text-xs mt-2 truncate font-medium">{doc.label || doc.name}</div>
                                                            </a>
                                                            {hasPermission(PERMISSIONS.MEMBERS_UPDATE) && (
                                                                <Button
                                                                    variant="destructive"
                                                                    size="icon"
                                                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm(t("members.deleteDocumentConfirm"))) {
                                                                            deleteMemberDocument(member.id, doc.name).then(() => {
                                                                                queryClient.invalidateQueries({ queryKey: ["/api/members"] });
                                                                                toast({ title: t('common.success'), description: t("members.documentDeleteSuccess") });
                                                                            });
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {!member.documents?.length && <div className="col-span-full text-center text-muted-foreground py-8">{t("members.noDocuments")}</div>}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )
                            )}
                        </TabsContent>

                        <TabsContent value="subscriptions" className="m-0 text-start">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-start">{t('nav.subscriptions')}</h3>
                                    {hasPermission(PERMISSIONS.SUBSCRIPTIONS_CREATE) && !showAddSubForm && (
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => setShowAddSubForm(true)}>
                                                <Plus className="h-4 w-4 me-2" /> {t('subscriptions.newSubscription')}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {showAddSubForm && (
                                    <Card className="p-4 border-primary/50 bg-primary/5 space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-start">{t('subscriptions.newSubscription')}</h4>
                                            <Button variant="ghost" size="sm" onClick={() => setShowAddSubForm(false)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('subscriptions.package')}</Label>
                                                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                                                    <SelectTrigger><SelectValue placeholder={t("subscriptions.selectPackage")} /></SelectTrigger>
                                                    <SelectContent>
                                                        {packages?.map(pkg => (
                                                            <SelectItem key={pkg.id} value={pkg.id}>
                                                                {pkg.name} ({pkg.price} {t("common.currency")})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('subscriptions.startDate')}</Label>
                                                <Input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={e => setStartDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('subscriptions.endDate')}</Label>
                                                <Input
                                                    type="date"
                                                    value={endDatePreview}
                                                    disabled
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('finance.paymentMethod')}</Label>
                                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="cash">{t("finance.paymentMethods.cash")}</SelectItem>
                                                        <SelectItem value="card">{t("finance.paymentMethods.card")}</SelectItem>
                                                        <SelectItem value="transfer">{t("finance.paymentMethods.transfer")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('finance.paymentStatus')}</Label>
                                                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="paid">{t("finance.paid")}</SelectItem>
                                                        <SelectItem value="unpaid">{t("finance.unpaid")}</SelectItem>
                                                        <SelectItem value="pending">{t("finance.pending")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-end md:col-span-2">
                                                <Button
                                                    className="w-full"
                                                    onClick={handleAddSubscription}
                                                    disabled={createSubscriptionMutation.isPending || !selectedPackageId || hasOverlappingSubscription}
                                                >
                                                    {hasOverlappingSubscription
                                                        ? t('subscriptions.overlapButton')
                                                        : (createSubscriptionMutation.isPending
                                                            ? <Loader2 className="animate-spin h-4 w-4" />
                                                            : t('common.save')
                                                        )}
                                                </Button>
                                            </div>
                                        </div>
                                        {hasOverlappingSubscription && (
                                            <p className="text-xs text-destructive">
                                                {t('subscriptions.overlapWarning')}
                                            </p>
                                        )}
                                    </Card>
                                )}

                                {(() => {
                                    if (loadingSubs) return <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /><p className="mt-2 text-sm text-muted-foreground">{t('common.loading')}</p></div>;
                                    if (errorSubs) return <div className="text-center py-8 text-destructive"><AlertCircle className="h-8 w-8 mx-auto mb-2" /><p>{t('common.error')}</p></div>;

                                    const now = startOfDay(new Date());
                                    const activeSub = memberSubscriptions
                                        ?.filter((s) => {
                                            try {
                                                const start = startOfDay(parseISO(s.startDate));
                                                const end = endOfDay(parseISO(s.endDate));
                                                return isWithinInterval(now, { start, end });
                                            } catch (e) {
                                                return false;
                                            }
                                        })
                                        .sort((a, b) => {
                                            try {
                                                return parseISO(b.endDate).getTime() - parseISO(a.endDate).getTime();
                                            } catch {
                                                return 0;
                                            }
                                        })[0];
                                    const historySubs = memberSubscriptions?.filter(s => s.id !== activeSub?.id) || [];

                                    return (
                                        <>
                                            {activeSub && (() => {
                                                const status = getSubscriptionStatus(activeSub.startDate, activeSub.endDate);
                                                const isExpiring = status === 'aboutToExpire';
                                                const isExpired = status === 'expired';

                                                return (
                                                    <div className="mb-6">
                                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 text-start">{t("subscriptions.currentSubscription")}</h4>
                                                        <Card className={`border-2 shadow-sm ${isExpired ? 'border-destructive bg-destructive/5' :
                                                            isExpiring ? 'border-orange-500 bg-orange-50' :
                                                                'border-green-500 bg-green-50'
                                                            }`}>
                                                            <div className="p-4 flex justify-between items-center text-start">
                                                                <div className="text-start">
                                                                    <div className={`font-bold text-lg text-start ${isExpired ? 'text-destructive' :
                                                                        isExpiring ? 'text-orange-700' :
                                                                            'text-green-700'
                                                                        }`}>{activeSub.planName}</div>
                                                                    <div className={`text-sm font-medium text-start ${isExpired ? 'text-destructive/80' :
                                                                        isExpiring ? 'text-orange-600' :
                                                                            'text-green-600'
                                                                        }`}>
                                                                        {activeSub.startDate} - {activeSub.endDate}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                                        {isExpired ? (
                                                                            <>
                                                                                <AlertCircle className="h-3 w-3 text-destructive" />
                                                                                {t('common.expired')}
                                                                            </>
                                                                        ) : isExpiring ? (
                                                                            <>
                                                                                <AlertCircle className="h-3 w-3 text-orange-500" />
                                                                                {t('common.aboutToExpire')}
                                                                            </>
                                                                        ) : status === 'upcoming' ? (
                                                                            <>
                                                                                <Calendar className="h-3 w-3 text-blue-500" />
                                                                                {t('common.upcoming')}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                                                {t('common.active')}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2 text-end">
                                                                    <div className={`text-xl font-bold ${isExpired ? 'text-destructive' :
                                                                        isExpiring ? 'text-orange-700' :
                                                                            'text-green-700'
                                                                        }`}>{activeSub.amount} {t("common.currency")}</div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                            onClick={() => {
                                                                                setPrintType('subscription');
                                                                                setPrintData(activeSub);
                                                                                setIsReceiptTypeDialogOpen(true);
                                                                            }}
                                                                        >
                                                                            <Printer className="h-4 w-4" />
                                                                        </Button>
                                                                        {hasPermission(PERMISSIONS.SUBSCRIPTIONS_DELETE) && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                                onClick={() => {
                                                                                    if (confirm(t('common.deleteConfirm'))) {
                                                                                        deleteSubscriptionMutation.mutate(activeSub.id);
                                                                                    }
                                                                                }}
                                                                                disabled={deleteSubscriptionMutation.isPending}
                                                                            >
                                                                                {deleteSubscriptionMutation.isPending && deleteSubscriptionMutation.variables === activeSub.id
                                                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                                    : <Trash2 className="h-4 w-4" />}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    </div>
                                                );
                                            })()}

                                            <h4 className="text-sm font-medium text-muted-foreground mb-2 text-start">{t('subscriptions.history')}</h4>
                                            <div className="space-y-2 text-start">
                                                {historySubs.map(sub => {
                                                    const status = getSubscriptionStatus(sub.startDate, sub.endDate);
                                                    const statusLabel = status === 'active'
                                                        ? t('common.active')
                                                        : status === 'aboutToExpire'
                                                            ? t('common.aboutToExpire')
                                                            : status === 'upcoming'
                                                                ? t('common.upcoming')
                                                                : t('common.expired');
                                                    const badgeVariant = status === 'active'
                                                        ? 'default'
                                                        : status === 'aboutToExpire' || status === 'upcoming'
                                                            ? 'outline'
                                                            : 'secondary';
                                                    const badgeClass = status === 'active'
                                                        ? 'bg-green-600'
                                                        : status === 'aboutToExpire'
                                                            ? 'border-orange-500 text-orange-600'
                                                            : status === 'upcoming'
                                                                ? 'border-blue-500 text-blue-600'
                                                                : '';
                                                    return (
                                                        <Card key={sub.id} className="overflow-hidden bg-card/50">
                                                            <div className="p-4 flex justify-between items-center text-start">
                                                                <div className="text-start">
                                                                    <div className="font-bold text-start">{sub.planName}</div>
                                                                    <div className="text-sm text-muted-foreground text-start">
                                                                        {sub.startDate} - {sub.endDate}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-end">
                                                                        <div className="font-medium text-start">{sub.amount} {t("common.currency")}</div>
                                                                        <Badge
                                                                            variant={badgeVariant as "default" | "outline" | "secondary"}
                                                                            className={`mt-1 text-[10px] uppercase ${badgeClass}`}
                                                                        >
                                                                            {statusLabel}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                            onClick={() => {
                                                                                setPrintType('subscription');
                                                                                setPrintData(sub);
                                                                                setIsReceiptTypeDialogOpen(true);
                                                                            }}
                                                                        >
                                                                            <Printer className="h-4 w-4" />
                                                                        </Button>
                                                                        {hasPermission(PERMISSIONS.SUBSCRIPTIONS_DELETE) && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                                onClick={() => {
                                                                                    if (confirm(t('common.deleteConfirm'))) {
                                                                                        deleteSubscriptionMutation.mutate(sub.id);
                                                                                    }
                                                                                }}
                                                                                disabled={deleteSubscriptionMutation.isPending}
                                                                            >
                                                                                {deleteSubscriptionMutation.isPending && deleteSubscriptionMutation.variables === sub.id
                                                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                                    : <Trash2 className="h-4 w-4" />}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    );
                                                })}
                                                {!activeSub && historySubs.length === 0 && (
                                                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                                                        {t('common.noResults')}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </TabsContent>

                        <TabsContent value="belts" className="m-0 text-start">
                            <div className="space-y-4">

                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-start">{t('belts.title')}</h3>
                                    {hasPermission(PERMISSIONS.BELTS_CREATE) && !showAssignBeltForm && (
                                        <Button size="sm" onClick={() => setShowAssignBeltForm(true)}>
                                            <Plus className="h-4 w-4 me-2" /> {t('belts.addBelt')}
                                        </Button>
                                    )}
                                </div>

                                {/* Belt Timeline */}
                                <Card
                                    className="p-6 bg-muted/10 overflow-x-auto scrollbar-hide"
                                    style={{
                                        msOverflowStyle: 'none',
                                        scrollbarWidth: 'none',
                                        WebkitOverflowScrolling: 'touch'
                                    }}
                                >
                                    <div className="flex items-center min-w-max justify-center mx-auto py-2">
                                        {belts?.sort((a, b) => a.order - b.order).map((belt, index, array) => {
                                            const earnedBelt = memberBelts?.find(mb => mb.beltId === belt.id);
                                            const isEarned = !!earnedBelt;
                                            const isNext = !isEarned && (index === 0 || !!memberBelts?.find(mb => mb.beltId === array[index - 1].id));
                                            const isLast = index === array.length - 1;

                                            return (
                                                <div key={belt.id} className="flex items-center">
                                                    <div className="relative flex flex-col items-center group">
                                                        <div
                                                            className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all duration-300 z-10 relative
                                                                ${isEarned
                                                                    ? 'border-primary shadow-lg scale-110'
                                                                    : isNext
                                                                        ? 'border-dashed border-muted-foreground/50 bg-background opacity-80'
                                                                        : 'border-muted bg-muted opacity-40 grayscale'
                                                                }
                                                            `}
                                                            style={{
                                                                backgroundColor: isEarned ? belt.color : isNext ? undefined : belt.color
                                                            }}
                                                            title={belt.name}
                                                        >
                                                            {isEarned && <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />}
                                                            {!isEarned && isNext && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: belt.color }} />}
                                                        </div>

                                                        <div className="absolute top-full mt-3 flex flex-col items-center w-32 text-center">
                                                            <div className={`font-bold text-sm ${isEarned ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                                {belt.name}
                                                            </div>
                                                            {isEarned && (
                                                                <div className="text-[10px] text-muted-foreground font-medium bg-background/80 px-2 py-0.5 rounded-full border mt-1">
                                                                    {format(new Date(earnedBelt.awardedAt), "MMM yyyy", { locale: language === 'ar' ? ar : enUS })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {!isLast && (
                                                        <div className={`h-1 w-12 sm:w-20 lg:w-32 transition-colors duration-500 rounded-full mx-[-4px] z-0
                                                            ${isEarned && memberBelts?.find(mb => mb.beltId === array[index + 1].id)
                                                                ? 'bg-primary'
                                                                : 'bg-muted-foreground/20'
                                                            }
                                                        `} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="h-16" /> {/* Spacer for labels */}
                                </Card>

                                {showAssignBeltForm && (
                                    <Card className="p-4 border-primary/50 bg-primary/5 space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-start">{t('belts.addBelt')}</h4>
                                            <Button variant="ghost" size="sm" onClick={() => setShowAssignBeltForm(false)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('belts.beltName')}</Label>
                                                <Select value={selectedBeltId} onValueChange={setSelectedBeltId}>
                                                    <SelectTrigger><SelectValue placeholder={t("belts.selectBelt")} /></SelectTrigger>
                                                    <SelectContent>
                                                        {belts?.sort((a, b) => a.order - b.order).map(belt => (
                                                            <SelectItem key={belt.id} value={belt.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-3 h-3 rounded-full border border-muted" style={{ backgroundColor: belt.color }} />
                                                                    {belt.name}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('common.date')}</Label>
                                                <Input
                                                    type="date"
                                                    value={awardDate}
                                                    onChange={e => setAwardDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="md:col-span-2 flex justify-end">
                                                <Button
                                                    className="w-full md:w-auto px-8"
                                                    onClick={handleAssignBelt}
                                                    disabled={assignBeltMutation.isPending || !selectedBeltId}
                                                >
                                                    {assignBeltMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                                                    {t('common.save')}
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2 text-start">{t('belts.currentBelts')}</h4>
                                    {memberBelts?.sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime()).map(mb => {
                                        const beltDetails = belts?.find(b => b.id === mb.beltId);
                                        return (
                                            <Card key={mb.id} className="p-4 flex items-center justify-between bg-card/50">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-10 h-10 rounded-full border-2 border-white shadow-md flex-shrink-0"
                                                        style={{ backgroundColor: beltDetails?.color || '#ccc' }}
                                                    />
                                                    <div>
                                                        <div className="font-bold text-lg">{beltDetails?.name || 'Unknown Belt'}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {format(new Date(mb.awardedAt), "PPP", { locale: language === 'ar' ? ar : enUS })}
                                                        </div>
                                                    </div>
                                                </div>
                                                {hasPermission(PERMISSIONS.BELTS_DELETE) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            if (confirm(t('common.deleteConfirm'))) revokeBeltMutation.mutate(mb.id);
                                                        }}
                                                        disabled={revokeBeltMutation.isPending}
                                                    >
                                                        {revokeBeltMutation.isPending && revokeBeltMutation.variables === mb.id ?
                                                            <Loader2 className="h-4 w-4 animate-spin" /> :
                                                            <Trash2 className="h-4 w-4" />
                                                        }
                                                    </Button>
                                                )}
                                            </Card>
                                        );
                                    })}
                                    {!memberBelts?.length && (
                                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                                            {t('common.noResults')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="finance" className="m-0 text-start">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-start">{t('sales.purchaseHistory')}</h3>
                                    {hasPermission(PERMISSIONS.SALES_CREATE) && (
                                        <Button size="sm" onClick={() => setIsPOSOpen(true)}>
                                            <ShoppingCart className="h-4 w-4 me-2" /> {t('store.openPOS')}
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {loadingSales ? (
                                        <div className="text-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                            <p className="mt-2 text-sm text-muted-foreground">{t('common.loading')}</p>
                                        </div>
                                    ) : errorSales ? (
                                        <div className="text-center py-8 text-destructive">
                                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                                            <p>{t('common.error')}</p>
                                        </div>
                                    ) : groupedSales && groupedSales.length > 0 ? (
                                        groupedSales.map(receipt => (
                                            <Card key={receipt.id} className="p-4 bg-card/50 overflow-hidden">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-lg">
                                                                {receipt.isRealReceipt ? `${t('finance.receipt')} #${receipt.id}` : t('finance.singleSale')}
                                                            </div>
                                                            {receipt.paymentStatus === 'unpaid' && <Badge variant="destructive">{t('finance.unpaid')}</Badge>}
                                                            {receipt.paymentStatus === 'paid' && <Badge variant="default" className="bg-green-600">{t('finance.paid')}</Badge>}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1 text-start">
                                                            {(() => {
                                                                try {
                                                                    return format(new Date(receipt.date), "PPP p", { locale: language === 'ar' ? ar : enUS });
                                                                } catch (e) {
                                                                    return receipt.date || "-";
                                                                }
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {receipt.paymentStatus === 'unpaid' && (
                                                            <Button
                                                                size="sm"
                                                                className="h-8"
                                                                onClick={() => {
                                                                    if (confirm(t('finance.confirmPayment'))) {
                                                                        payReceiptMutation.mutate({ receiptId: receipt.id, method: 'cash' });
                                                                    }
                                                                }}
                                                                disabled={payReceiptMutation.isPending}
                                                            >
                                                                {payReceiptMutation.isPending && payReceiptMutation.variables?.receiptId === receipt.id ?
                                                                    <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                                                {t('finance.payReceipt')}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => {
                                                                setPrintType('sale');
                                                                setPrintData(receipt);
                                                                setIsReceiptTypeDialogOpen(true);
                                                            }}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                        {hasPermission(PERMISSIONS.SALES_DELETE) && (
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                onClick={() => {
                                                                    if (confirm(t('common.deleteConfirm'))) {
                                                                        if (receipt.isRealReceipt) {
                                                                            deleteReceiptMutation.mutate(receipt.id);
                                                                        } else {
                                                                            deleteSaleMutation.mutate(receipt.items[0].id);
                                                                        }
                                                                    }
                                                                }}
                                                                disabled={deleteReceiptMutation.isPending || deleteSaleMutation.isPending}
                                                            >
                                                                {(deleteReceiptMutation.isPending && deleteReceiptMutation.variables === receipt.id) ||
                                                                    (deleteSaleMutation.isPending && deleteSaleMutation.variables === receipt.items[0].id) ?
                                                                    <Loader2 className="h-4 w-4 animate-spin" /> :
                                                                    <Trash2 className="h-4 w-4" />
                                                                }
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 pt-3 border-t">
                                                    {receipt.items.map(item => (
                                                        <div key={item.id} className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <Package className="h-3 w-3 text-muted-foreground" />
                                                                <span>{item.productName}</span>
                                                                <Badge variant="outline" className="text-[10px] py-0">x{item.quantity}</Badge>
                                                            </div>
                                                            <div className="font-mono">{item.totalPrice.toFixed(3)} {t("common.currency")}</div>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between items-center pt-2 font-bold text-primary border-t border-dashed mt-2">
                                                        <span>{t('store.total')}</span>
                                                        <span>{receipt.total.toFixed(3)} {t("common.currency")}</span>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                                            {t('common.noResults')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="attendance" className="m-0 text-start">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-start">{t('nav.attendance')}</h3>
                                    {member && hasPermission(PERMISSIONS.ATTENDANCE_CREATE) && !showAddAttendanceForm && (
                                        <Button size="sm" onClick={openAttendanceForm}>
                                            <Plus className="h-4 w-4 me-2" /> {t('attendance.addAttendance')}
                                        </Button>
                                    )}
                                </div>

                                {member && hasPermission(PERMISSIONS.ATTENDANCE_CREATE) && showAddAttendanceForm && (
                                    <Card className="p-4 border-primary/50 bg-primary/5 space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-start">{t('attendance.addAttendance')}</h4>
                                            <Button variant="ghost" size="sm" onClick={closeAttendanceForm}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('common.date')}</Label>
                                                <Input
                                                    type="date"
                                                    value={attendanceDate}
                                                    onChange={(e) => setAttendanceDate(e.target.value)}
                                                    disabled={addAttendanceMutation.isPending}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('common.time')}</Label>
                                                <Input
                                                    type="time"
                                                    value={attendanceTime}
                                                    onChange={(e) => setAttendanceTime(e.target.value)}
                                                    disabled={addAttendanceMutation.isPending}
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    className="w-full"
                                                    onClick={handleAddAttendance}
                                                    disabled={addAttendanceMutation.isPending || !attendanceDate}
                                                >
                                                    {addAttendanceMutation.isPending ? (
                                                        <Loader2 className="animate-spin h-4 w-4" />
                                                    ) : (
                                                        t('common.save')
                                                    )}
                                                </Button>
                                            </div>
                                            <div className="space-y-2 md:col-span-3">
                                                <Label>{t('common.notes')}</Label>
                                                <Textarea
                                                    value={attendanceNotes}
                                                    onChange={(e) => setAttendanceNotes(e.target.value)}
                                                    placeholder={`${t('common.notes')} (${t('common.optional')})`}
                                                    rows={3}
                                                    disabled={addAttendanceMutation.isPending}
                                                />
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {loadingAttendance ? (
                                    <div className="flex justify-center items-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : memberAttendance && memberAttendance.length > 0 ? (
                                    <div className="space-y-6">
                                        {/* Statistics Cards */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('attendance.totalAttendance')}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{memberAttendance.length}</div>
                                                    <p className="text-xs text-muted-foreground">{t('attendance.days')}</p>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('attendance.thisWeek')}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {memberAttendance.filter(a => {
                                                            const attendanceDate = new Date(a.date);
                                                            const now = new Date();
                                                            const weekStart = new Date(now);
                                                            weekStart.setDate(now.getDate() - now.getDay());
                                                            weekStart.setHours(0, 0, 0, 0);
                                                            return attendanceDate >= weekStart;
                                                        }).length}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{t('attendance.days')}</p>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('attendance.thisMonth')}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {memberAttendance.filter(a => {
                                                            const attendanceDate = new Date(a.date);
                                                            const now = new Date();
                                                            return attendanceDate.getMonth() === now.getMonth() &&
                                                                attendanceDate.getFullYear() === now.getFullYear();
                                                        }).length}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{t('attendance.days')}</p>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('attendance.last30Days')}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">
                                                        {memberAttendance.filter(a => {
                                                            const attendanceDate = new Date(a.date);
                                                            const now = new Date();
                                                            const thirtyDaysAgo = new Date(now);
                                                            thirtyDaysAgo.setDate(now.getDate() - 30);
                                                            return attendanceDate >= thirtyDaysAgo;
                                                        }).length}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{t('attendance.days')}</p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Attendance History */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>{t('attendance.attendanceHistory')}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-6">
                                                    {Object.entries(
                                                        memberAttendance.reduce((acc, attendance) => {
                                                            const date = new Date(attendance.date);
                                                            const monthKey = format(date, 'MMMM yyyy', { locale: dir === 'rtl' ? ar : enUS });
                                                            if (!acc[monthKey]) acc[monthKey] = [];
                                                            acc[monthKey].push(attendance);
                                                            return acc;
                                                        }, {} as Record<string, typeof memberAttendance>)
                                                    ).slice(0, 6).map(([month, attendances]) => (
                                                        <div key={month} className="space-y-3">
                                                            <div className="flex items-center justify-between pb-2 border-b">
                                                                <h4 className="font-semibold">{month}</h4>
                                                                <Badge variant="secondary">{attendances.length} {t('attendance.days')}</Badge>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {attendances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((attendance) => {
                                                                    const attendanceDate = new Date(attendance.date);
                                                                    return (
                                                                        <div
                                                                            key={attendance.id}
                                                                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20">
                                                                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                                                </div>
                                                                                <div>
                                                                                    <div className="font-medium">
                                                                                        {format(attendanceDate, 'EEEE', { locale: dir === 'rtl' ? ar : enUS })}
                                                                                    </div>
                                                                                    <div className="text-sm text-muted-foreground">
                                                                                        {format(attendanceDate, 'PPP', { locale: dir === 'rtl' ? ar : enUS })}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                                <span>{format(attendanceDate, 'p', { locale: dir === 'rtl' ? ar : enUS })}</span>
                                                                                {hasPermission(PERMISSIONS.ATTENDANCE_DELETE) && (
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                                        onClick={() => {
                                                                                            if (confirm(t('common.deleteConfirm'))) {
                                                                                                deleteAttendanceMutation.mutate(attendance.id);
                                                                                            }
                                                                                        }}
                                                                                        disabled={deleteAttendanceMutation.isPending}
                                                                                    >
                                                                                        {deleteAttendanceMutation.isPending && deleteAttendanceMutation.variables === attendance.id
                                                                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                                            : <Trash2 className="h-4 w-4" />}
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>{t('attendance.noAttendance')}</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>

            {member && (
                <POSDialog
                    isOpen={isPOSOpen}
                    onClose={() => setIsPOSOpen(false)}
                    member={member}
                />
            )}

            <WhatsAppTemplateDialog
                member={memberForWhatsApp}
                open={isWhatsAppDialogOpen}
                onOpenChange={setIsWhatsAppDialogOpen}
                templates={clubSettings?.whatsappTemplates ?? []}
            />

            <ReceiptTypeDialog
                isOpen={isReceiptTypeDialogOpen}
                onClose={() => setIsReceiptTypeDialogOpen(false)}
                onSelect={(format) => {
                    if (printData && printType) {
                        printReceipt({
                            type: printType,
                            data: printData,
                            settings: clubSettings,
                            language: language as any,
                            t,
                            format
                        });
                    }
                }}
            />
        </Dialog>
    );
}
