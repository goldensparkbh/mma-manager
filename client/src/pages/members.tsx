import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Plus, Search, Trash2, UserPlus, Award, Printer, X, Pencil, Download, FileText, LayoutGrid, LayoutList, CreditCard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getAllAttendance, getSubscriptionsByMember } from "@/lib/firebaseData";
import type { Member, InsertMember, Belt, MemberBelt, InsertMemberBelt, Attendance, Subscription, SubscriptionPackage } from "@shared/schema";

import { useAuth } from "@/context/auth-context";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Members() {
  const { role, clubSettings } = useAuth();
  const isAdmin = role === "admin";
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [awardBeltId, setAwardBeltId] = useState("");
  /* Selection State */
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [cardMember, setCardMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Subscription State
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [selectedSubscriptionMemberId, setSelectedSubscriptionMemberId] = useState<string | null>(null);
  const [newSubscriptionData, setNewSubscriptionData] = useState({
    packageId: "",
    duration: 30, // Default duration in days
    startDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash"
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState<Partial<InsertMember>>({
    name: "",
    firstName: "",
    grandFatherName: "",
    lastName: "",
    phone: "",
    email: "",
    dob: "",
    gender: undefined, // "male" | "female"
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

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Queries
  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: belts } = useQuery<Belt[]>({
    queryKey: ["/api/belts"],
  });

  const { data: memberBelts } = useQuery<MemberBelt[]>({
    queryKey: ["/api/member-belts"],
  });

  const { data: allAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/all"],
    queryFn: getAllAttendance,
    enabled: selectedMembers.size > 0
  });

  const { data: memberSubscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions", selectedSubscriptionMemberId],
    queryFn: () => selectedSubscriptionMemberId ? getSubscriptionsByMember(selectedSubscriptionMemberId) : Promise.resolve([]),
    enabled: !!selectedSubscriptionMemberId
  });

  const { data: packages } = useQuery<SubscriptionPackage[]>({
    queryKey: ["/api/packages"],
  });



  // Upload Logic
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن لا يتجاوز 5 ميجابايت",
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
          title: "خطأ",
          description: `حجم الملف ${file.name} يتجاوز 4 ميجابايت`,
          variant: "destructive",
        });
        continue;
      }
      newFiles.push(file);
    }
    setDocumentFiles(prev => [...prev, ...newFiles]);
  };

  const removeDocument = (index: number) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Mutations
  const createMember = useMutation({
    mutationFn: async (data: InsertMember & { imageFile?: File | null, documentFiles?: File[] }) => {
      // Logic for memberId is handled in backend now
      const response = await apiRequest("POST", "/api/members", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "تم بنجاح", description: "تم إضافة العضو الجديد بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء إضافة العضو" });
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertMember> & { imageFile?: File | null, documentFiles?: File[] } }) => {
      const response = await apiRequest("PATCH", `/api/members/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "تم بنجاح", description: "تم تعديل بيانات العضو" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل تعديل العضو" });
    }
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "تم الحذف", description: "تم حذف العضو بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل حذف العضو" });
    }
  });

  const awardBelt = useMutation({
    mutationFn: async ({ memberId, beltId }: { memberId: string; beltId: string }) => {
      const data: InsertMemberBelt = { memberId, beltId };
      const response = await apiRequest("POST", "/api/member-belts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member-belts"] });
      setAwardBeltId("");
      toast({ title: "تم بنجاح", description: "تم منح الحزام للعضو" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message || "فشل منح الحزام" });
    },
  });

  const revokeBelt = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/member-belts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member-belts"] });
      toast({ title: "تم بنجاح", description: "تم سحب الحزام" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل سحب الحزام" });
    }
  });

  const createSubscription = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/subscriptions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions", selectedSubscriptionMemberId] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] }); // To update status/expiry
      toast({ title: "تم التجديد", description: "تم تجديد الاشتراك بنجاح" });
      setNewSubscriptionData({
        packageId: "",
        duration: 30,
        startDate: new Date().toISOString().split("T")[0],
        paymentMethod: "cash"
      });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل تجديد الاشتراك" });
    }
  });

  // Handlers
  const resetForm = () => {
    setImagePreview(null);
    setImageFile(null);
    setDocumentFiles([]);
    setEditingMemberId(null);
    setFormData({
      name: "",
      firstName: "",
      grandFatherName: "",
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
  };

  const openEditDialog = (member: Member) => {
    setEditingMemberId(member.id);
    setFormData({
      name: member.name,
      firstName: member.firstName || "",
      grandFatherName: member.grandFatherName || "",
      lastName: member.lastName || "",
      phone: member.phone,
      email: member.email || "",
      dob: member.dob || "",
      gender: (member.gender as "male" | "female" | undefined) || undefined,
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
    setDocumentFiles([]); // Reset files on edit open, existing docs should be shown separately if needed or just handled via adding new ones? 
    // Ideally we list existing docs from member.documents and allow adding more.
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name && (!formData.firstName || !formData.lastName)) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى إدخال الاسم" });
      return;
    }

    // Construct full name if composed parts are used and main name is empty or being updated
    // For now we trust the inputs. If firstName/lastName are filled, we might update `name`
    let finalName = formData.name;
    if (formData.firstName || formData.lastName) {
      finalName = [formData.firstName, formData.grandFatherName, formData.lastName].filter(Boolean).join(" ");
    }

    // Update formData name before submit
    const submissionData = { ...formData, name: finalName };

    if (!submissionData.name || !submissionData.phone) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى ملء الاسم ورقم الهاتف" });
      return;
    }

    if (editingMemberId) {
      updateMember.mutate({ id: editingMemberId, data: { ...submissionData, imageFile, documentFiles } });
    } else {
      createMember.mutate({ ...(submissionData as InsertMember), memberId: "temp", imageFile, documentFiles });
    }
  };

  const handleAwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId && awardBeltId) {
      awardBelt.mutate({ memberId: selectedMemberId, beltId: awardBeltId });
    }
  };

  const handleSubscriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubscriptionMemberId || !newSubscriptionData.packageId) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى اختيار الباقة" });
      return;
    }

    const selectedPkg = packages?.find(p => p.id === newSubscriptionData.packageId);
    if (!selectedPkg) return;

    const startDate = new Date(newSubscriptionData.newStartDate || new Date());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + selectedPkg.duration);

    const subData = {
      memberId: selectedSubscriptionMemberId,
      memberName: members?.find(m => m.id === selectedSubscriptionMemberId)?.name || "Unknown",
      planName: selectedPkg.name,
      amount: selectedPkg.price,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: "active",
      paymentMethod: newSubscriptionData.paymentMethod,
      paymentStatus: "paid"
    };

    createSubscription.mutate(subData);
  };


  // Export Logic
  const toggleSelectAll = () => {
    if (selectedMembers.size === filteredMembers?.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers?.map(m => m.id) ?? []));
    }
  };

  const toggleSelectMember = (id: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMembers(newSelected);
  };

  const handleExport = async () => {
    if (selectedMembers.size === 0) return;

    // Ensure we have attendance data. If useQuery hasn't finished, wait (or refetch).
    // Simple way: call getAllAttendance directly if missing, or trust useQuery if enabled.
    // For safety, let's fetch if missing.
    let attendanceData = allAttendance;
    if (!attendanceData) {
      attendanceData = await getAllAttendance();
    }

    const membersToExport = members?.filter(m => selectedMembers.has(m.id)) ?? [];

    // CSV Header
    const headers = [
      "الاسم", "رقم العضوية", "الهاتف", "البريد الإلكتروني",
      "تاريخ الميلاد", "الجنس", "الوزن", "الطول",
      "فصيلة الدم", "مقاس الحزام", "مقاس البدلة", "الحالة",
      "تاريخ انتهاء الاشتراك", "أحدث حزام", "تاريخ الحزام",
      "عدد مرات الحضور (الاشتراك الحالي)", "عدد مرات الحضور (منذ آخر حزام)"
    ];

    const rows = membersToExport.map(m => {
      // Attendance Specs
      const memberAttendance = attendanceData?.filter(a => a.memberId === m.memberId || a.memberId === m.id) || [];

      // 1. Current Subscription
      let subAttendance = 0;
      if (m.subscriptionStart) {
        subAttendance = memberAttendance.filter(a => a.date >= m.subscriptionStart!).length;
      }

      // 2. Since Last Belt
      let beltAttendance = 0;
      const myBelts = memberBelts?.filter(mb => mb.memberId === m.id) || [];
      // Sort DESC
      myBelts.sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());
      const lastBelt = myBelts[0];
      if (lastBelt) {
        beltAttendance = memberAttendance.filter(a => a.date >= lastBelt.awardedAt).length;
      } else {
        beltAttendance = memberAttendance.length; // Default to all time if no belt? Or 0? "Since last belt" usually implies "Since the beginning" if no belt.
      }

      const lastBeltName = lastBelt ? belts?.find(b => b.id === lastBelt.beltId)?.name : "لا يوجد";
      const lastBeltDate = lastBelt ? new Date(lastBelt.awardedAt).toLocaleDateString('ar-BH') : "-";

      return [
        `"${m.name}"`,
        `"${m.memberId}"`,
        `"${m.phone}"`,
        `"${m.email || ''}"`,
        `"${m.dob || ''}"`,
        `"${m.gender === 'male' ? 'ذكر' : m.gender === 'female' ? 'أنثى' : ''}"`,
        `"${m.weight || ''}"`,
        `"${m.height || ''}"`,
        `"${m.bloodType || ''}"`,
        `"${m.beltSize || ''}"`,
        `"${m.suitSize || ''}"`,
        `"${m.status === 'active' ? 'نشط' : 'منتهي'}"`,
        `"${m.subscriptionEnd || ''}"`,
        `"${lastBeltName}"`,
        `"${lastBeltDate}"`,
        `"${subAttendance}"`,
        `"${beltAttendance}"`
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `members_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Helper
  const getMemberBeltsBadges = (memberId: string) => {
    const earned = memberBelts?.filter(mb => mb.memberId === memberId) || [];
    const badges = earned.map(mb => {
      const belt = belts?.find(b => b.id === mb.beltId);
      if (!belt) return null;
      return { ...belt, memberBeltId: mb.id };
    }).filter(Boolean) as (Belt & { memberBeltId: string })[];

    badges.sort((a, b) => (a.order || 0) - (b.order || 0));
    return badges;
  };

  const filteredMembers = members?.filter(
    (member) => {
      const matchesSearch = member.name.includes(searchQuery) ||
        member.memberId.includes(searchQuery) ||
        member.phone.includes(searchQuery);

      if (!matchesSearch) return false;

      // Status Filters
      if (activeTab === "all") return true;
      if (activeTab === "active") return member.status === "active";
      if (activeTab === "expired") return member.status === "expired" || (member.subscriptionEnd && new Date(member.subscriptionEnd) < new Date());
      if (activeTab === "soon") {
        if (!member.subscriptionEnd) return false;
        const end = new Date(member.subscriptionEnd);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7; // Expiring in next 7 days
      }
      return true;
    }
  );

  const getStatusBadge = (member: Member) => {
    if (!member.subscriptionEnd) {
      switch (member.status) {
        case "active": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/10 dark:text-green-300">نشط</Badge>;
        case "expired": return <Badge variant="destructive">منتهي</Badge>;
        default: return <Badge variant="secondary">{member.status}</Badge>;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(member.subscriptionEnd);
    if (isNaN(end.getTime())) {
      return <Badge variant="secondary">تاريخ غير صالح</Badge>;
    }
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge variant="destructive">منتهي</Badge>;
    } else if (diffDays <= 10) {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">ينتهي قريباً</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/10 dark:text-green-300">نشط</Badge>;
    }
  };

  const handlePrintCard = (member: Member) => {
    setCardMember(member);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Card><CardContent className="p-6"><Skeleton className="h-12 w-full mb-2" /></CardContent></Card>
      </div>
    );
  }

  // Derived state for selected member belts
  const selectedMemberBelts = selectedMemberId ? getMemberBeltsBadges(selectedMemberId) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">إدارة الأعضاء</h1>
          <p className="text-sm text-muted-foreground">إضافة وإدارة أعضاء النادي</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم، رقم العضوية، أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
              data-testid="input-search-members"
            />
          </div>
          <div className="flex gap-2">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">الكل</TabsTrigger>
                <TabsTrigger value="active">نشط</TabsTrigger>
                <TabsTrigger value="expired">منتهي</TabsTrigger>
                <TabsTrigger value="soon">ينتهي قريباً</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex gap-2">
            {selectedMembers.size > 0 && (
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                تصدير ({selectedMembers.size})
              </Button>
            )}
            <div className="flex bg-muted rounded-lg p-1 gap-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("list")}
                title="عرض القائمة"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("grid")}
                title="عرض الشبكة"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-member">
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة عضو جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    {editingMemberId ? "تعديل بيانات العضو" : "تسجيل عضو جديد"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="general">البيانات الأساسية</TabsTrigger>
                      <TabsTrigger value="details">التفاصيل الشخصية</TabsTrigger>
                      <TabsTrigger value="files">الملفات والملاحظات</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 pt-4">
                      {/* Name Section */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">الاسم الأول *</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName || ""}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="grandFatherName">الاسم الثاني</Label>
                          <Input
                            id="grandFatherName"
                            value={formData.grandFatherName || ""}
                            onChange={(e) => setFormData({ ...formData, grandFatherName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">اللقب</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName || ""}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">رقم التواصل *</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">الايميل (أو ولي الأمر)</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email || ""}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>تاريخ الميلاد</Label>
                        <Input
                          id="dob"
                          type="date"
                          value={formData.dob || ""}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="details" className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="age">العمر</Label>
                          <Input
                            id="age"
                            type="number"
                            value={formData.age ?? ""}
                            onChange={(e) =>
                              setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : undefined })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>الجنس</Label>
                          <Select value={formData.gender} onValueChange={(val: "male" | "female") => setFormData({ ...formData, gender: val })}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">ذكر</SelectItem>
                              <SelectItem value="female">أنثى</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>فصيلة الدم</Label>
                          <Select value={formData.bloodType || ""} onValueChange={(val) => setFormData({ ...formData, bloodType: val })}>
                            <SelectTrigger>
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="height">الطول (cm)</Label>
                          <Input
                            id="height"
                            value={formData.height || ""}
                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight">الوزن (kg)</Label>
                          <Input
                            id="weight"
                            value={formData.weight || ""}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="suitSize">قياس البدلة</Label>
                          <Input
                            id="suitSize"
                            placeholder="Ex: 5, 170cm..."
                            value={formData.suitSize || ""}
                            onChange={(e) => setFormData({ ...formData, suitSize: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="beltSize">قياس الحزام</Label>
                          <Input
                            id="beltSize"
                            placeholder="Ex: 280cm"
                            value={formData.beltSize || ""}
                            onChange={(e) => setFormData({ ...formData, beltSize: e.target.value })}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="files" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="healthNotes">ملاحظات صحية</Label>
                        <Textarea
                          id="healthNotes"
                          placeholder="مثال: ربو، حساسية... أو اتركه فارغاً"
                          rows={3}
                          value={formData.healthNotes ?? ""}
                          onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>صورة ملف شخصي</Label>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={imagePreview || ""} />
                            <AvatarFallback><UserPlus className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                              يفضل صورة مربعة، الحد الأقصى 5 ميجابايت.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>المرفقات (PDF, PNG, JPG - Max 4MB)</Label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-4">
                            <label className="cursor-pointer flex-1">
                              <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">إضافة ملفات</span>
                              </div>
                              <input
                                type="file"
                                multiple
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={handleDocumentUpload}
                              />
                            </label>
                          </div>

                          {/* New Files List */}
                          {documentFiles.length > 0 && (
                            <div className="grid gap-2">
                              <Label className="text-xs text-muted-foreground mt-2">ملفات جديدة:</Label>
                              {documentFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                                  <span className="truncate max-w-[200px]">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeDocument(index)}
                                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Existing Documents List (Read-only / Download) */}
                          {editingMemberId && members?.find(m => m.id === editingMemberId)?.documents && (
                            <div className="grid gap-2 mt-2">
                              <Label className="text-xs text-muted-foreground">المرفقات الحالية:</Label>
                              {members.find(m => m.id === editingMemberId)?.documents?.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-secondary/50 p-2 rounded text-sm">
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline truncate max-w-[220px]">
                                    <FileText className="h-3 w-3" />
                                    {doc.name}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={createMember.isPending || updateMember.isPending}>
                      {createMember.isPending || updateMember.isPending ? "جاري الحفظ..." : editingMemberId ? "حفظ التغييرات" : "إضافة العضو"}
                    </Button>
                  </div>
                </form>

              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Manage Belts Dialog */}
        < Dialog open={isAwardDialogOpen} onOpenChange={setIsAwardDialogOpen} >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>الأحزمة - {members?.find(m => m.id === selectedMemberId)?.name}</DialogTitle></DialogHeader>

            {/* Current Belts */}
            <div className="mb-4">
              <Label className="mb-2 block text-sm font-medium">الأحزمة الحالية:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedMemberBelts.length > 0 ? selectedMemberBelts.map(b => (
                  <div key={b.memberBeltId} className="flex items-center gap-1 bg-secondary pl-2 pr-1 py-1 rounded-full text-xs">
                    <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: b.color }} />
                    <span>{b.name}</span>
                    <button
                      onClick={() => {
                        if (confirm("هل تريد سحب الحزام؟")) revokeBelt.mutate(b.memberBeltId);
                      }}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )) : (
                  <span className="text-muted-foreground text-xs">لا يوجد أحزمة</span>
                )}
              </div>
            </div>

            <form onSubmit={handleAwardSubmit} className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>منح حزام جديد</Label>
                <Select value={awardBeltId} onValueChange={setAwardBeltId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحزام..." />
                  </SelectTrigger>
                  <SelectContent>
                    {belts?.map(belt => (
                      <SelectItem key={belt.id} value={belt.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: belt.color }}></div>
                          {belt.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={awardBelt.isPending}>
                تأكيد المنح
              </Button>
            </form>
          </DialogContent>
        </Dialog >
      </div >

      {viewMode === "list" ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">قائمة الأعضاء</CardTitle>
            {/* Search Input handled above */}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 w-[40px]">
                      <Checkbox
                        checked={filteredMembers?.length! > 0 && selectedMembers.size === filteredMembers?.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">العضو</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">رقم العضوية</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">وسام</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">رصيد</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers && filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => {
                      const isExpired = member.subscriptionEnd ? new Date(member.subscriptionEnd) < new Date() : false;
                      const status = isExpired ? "expired" : member.status;

                      return (
                        <tr key={member.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors group">
                          <td className="py-3 px-4">
                            <Checkbox
                              checked={selectedMembers.has(member.id)}
                              onCheckedChange={() => toggleSelectMember(member.id)}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8"><AvatarImage src={member.imageUrl || undefined} /><AvatarFallback>{member.name[0]}</AvatarFallback></Avatar>
                              <span>{member.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">#{member.memberId}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex -space-x-1">
                              {getMemberBeltsBadges(member.id).map(b => (
                                <div key={b.memberBeltId} className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: b.color }} title={b.name} />
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">{getStatusBadge(member)}</td>
                          <td className="py-3 px-3 text-right font-mono">{member.balance || 0} د.ب</td>
                          <td className="py-3 px-3 flex items-center gap-2 text-right">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePrintCard(member)} title="بطاقة العضوية">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(member)}
                              title="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm('هل أنت متأكد من حذف العضو؟')) deleteMember.mutate(member.id);
                                }}
                                title="حذف"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <div className="w-px h-4 bg-border mx-1"></div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1"
                              onClick={() => {
                                setSelectedMemberId(member.id);
                                setAwardBeltId("");
                                setIsAwardDialogOpen(true);
                              }}
                              title="الأحزمة"
                            >
                              <Award className="h-3 w-3" />
                              الأحزمة
                            </Button>
                            <div className="w-px h-4 bg-border mx-1"></div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1"
                              onClick={() => {
                                setSelectedSubscriptionMemberId(member.id);
                                setIsSubscriptionDialogOpen(true);
                              }}
                              title="الاشتراكات"
                            >
                              <CreditCard className="h-3 w-3" />
                              الاشتراكات
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (<tr><td colSpan={7} className="text-center py-8">لا توجد بيانات</td></tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMembers && filteredMembers.length > 0 ? (
            filteredMembers.map((member) => {
              const isExpired = member.subscriptionEnd ? new Date(member.subscriptionEnd) < new Date() : false;

              return (
                <Card key={member.id} className="overflow-hidden hover:shadow-lg transition-shadow relative group">
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedMembers.has(member.id)}
                      onCheckedChange={() => toggleSelectMember(member.id)}
                    />
                  </div>
                  <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-4 border-muted">
                        <AvatarImage src={member.imageUrl || undefined} className="object-cover" />
                        <AvatarFallback className="text-2xl">{member.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2">
                        {getStatusBadge(member)}
                      </div>
                    </div>

                    <div className="w-full">
                      <h3 className="font-bold text-lg truncate" title={member.name}>{member.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground">ID: {member.memberId}</p>
                    </div>

                    <div className="flex -space-x-2 py-1 justify-center w-full">
                      {getMemberBeltsBadges(member.id).length > 0 ? getMemberBeltsBadges(member.id).map(b => (
                        <div key={b.memberBeltId} className="w-6 h-6 rounded-full border-2 border-background" style={{ backgroundColor: b.color }} title={b.name} />
                      )) : <div className="h-6"></div>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                      <div className="text-right">
                        <span className="block opacity-70">الهاتف</span>
                        <span dir="ltr">{member.phone}</span>
                      </div>
                      <div className="text-left">
                        <span className="block opacity-70">الانتهاء</span>
                        <span>{member.subscriptionEnd || "-"}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full mt-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handlePrintCard(member)}>
                        <Printer className="h-3 w-3 ml-1" /> بطاقة
                      </Button>
                      <Button size="sm" variant="ghost" className="px-2" onClick={() => openEditDialog(member)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2 h-8"
                        onClick={() => {
                          setSelectedMemberId(member.id);
                          setAwardBeltId("");
                          setIsAwardDialogOpen(true);
                        }}
                        title="الأحزمة"
                      >
                        <Award className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2 h-8"
                        onClick={() => {
                          setSelectedSubscriptionMemberId(member.id);
                          setIsSubscriptionDialogOpen(true);
                        }}
                        title="الاشتراكات"
                      >
                        <CreditCard className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              لا توجد بيانات
            </div>
          )}
        </div>
      )
      }

      {/* Membership Card Dialog */}
      <Dialog open={!!cardMember} onOpenChange={(open) => !open && setCardMember(null)}>
        <DialogContent className="sm:max-w-md flex flex-col items-center">
          {/* NO HEADER to keep clean */}
          {cardMember && (
            <div className="w-full flex flex-col items-center gap-4">
              <div id="membership-card" className="w-[300px] h-[450px] bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-xl shadow-2xl relative overflow-hidden flex flex-col items-center p-6 border border-neutral-700 select-none">
                {/* Top Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>

                {/* Logo / Brand */}
                <div className="mt-8 mb-4 flex flex-col items-center">
                  <img src={clubSettings?.logoUrlDark || clubSettings?.logoUrlLight || "/logo_dark_icon.svg"} alt="Logo" className="w-20 h-20 object-contain opacity-90 mb-2" />
                  <h2 className="text-xl font-black tracking-widest uppercase text-center leading-tight">
                    {clubSettings?.name || "Kumite Combat"}
                  </h2>
                </div>

                {/* Avatar */}
                <div className="w-24 h-24 shrink-0 aspect-square rounded-full border-4 border-neutral-800 shadow-xl overflow-hidden mb-6 bg-neutral-700">
                  {cardMember.imageUrl ?
                    <img src={cardMember.imageUrl} className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-neutral-500">{cardMember.name[0]}</div>
                  }
                </div>

                {/* Details */}
                <div className="text-center w-full">
                  <h1 className="text-xl font-bold mb-1 truncate px-2">{cardMember.name}</h1>
                  <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-mono mb-4 text-neutral-300">
                    ID: {cardMember.memberId}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto w-full pt-4 pb-2 border-t border-white/10 flex justify-between items-end">
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold">Member Since</p>
                    <p className="text-xs font-mono">{new Date().getFullYear()}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    {/* QR Code Placeholder removed */}
                  </div>
                </div>

                {/* Decorative overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>

              <div className="flex gap-2 w-full max-w-[300px]">
                <Button className="flex-1" onClick={() => {
                  const content = document.getElementById('membership-card')?.outerHTML;
                  const printWindow = window.open('', '', 'height=600,width=800');
                  if (printWindow && content) {
                    printWindow.document.write('<html><head><title>Membership Card</title>');
                    printWindow.document.write('<style>body{margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f0f0;} #membership-card { transform: scale(1); box-shadow: none !important; margin: 20px; } @media print { body { background: none; } #membership-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style>');
                    printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                    printWindow.document.write('</head><body>');
                    printWindow.document.write(content);
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                    }, 1000);
                  }
                }}>
                  <Printer className="w-4 h-4 ml-2" /> طباعة
                </Button>
                <Button variant="outline" onClick={() => setCardMember(null)}>إغلاق</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subscriptions History Dialog */}
      <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>سجل الاشتراكات - {members?.find(m => m.id === selectedSubscriptionMemberId)?.name}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Left: History List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                سجل الاشتراكات
              </h3>
              <div className="border rounded-lg divide-y bg-muted/20 max-h-[300px] overflow-y-auto">
                {(() => {
                  const currentMember = members?.find(m => m.id === selectedSubscriptionMemberId);
                  let displaySubs = memberSubscriptions ? [...memberSubscriptions] : [];

                  // Logic to check if current member subscription (from profile) is in the list
                  // If the member has a subscription date AND (list is empty OR the latest subscription in list doesn't match the member's start date)
                  // Then we assume the member has a "Legacy" or manually set subscription that's not in the 'subscriptions' collection yet.
                  if (currentMember?.subscriptionStart) {
                    const hasMatchingSub = displaySubs.some(s => s.startDate === currentMember.subscriptionStart);
                    if (!hasMatchingSub) {
                      const legacySub: Subscription = {
                        id: "legacy_current",
                        memberId: currentMember.id,
                        memberName: currentMember.name,
                        planName: "الاشتراك الحالي", // Fallback name
                        amount: 0, // Unknown amount
                        startDate: currentMember.subscriptionStart,
                        endDate: currentMember.subscriptionEnd || "",
                        status: currentMember.status,
                        paymentStatus: "paid"
                      };
                      displaySubs = [legacySub, ...displaySubs];
                    }
                  }

                  return displaySubs.length > 0 ? (
                    displaySubs.map((sub, idx) => (
                      <div key={sub.id} className={`p-3 text-sm flex justify-between items-center ${idx === 0 ? 'bg-primary/5' : ''}`}>
                        <div>
                          <div className="font-medium">{sub.planName} {sub.id === "legacy_current" && <span className="text-[10px] text-muted-foreground">(قديم/غير مسجل)</span>}</div>
                          <div className="text-xs text-muted-foreground">{sub.startDate} <span className="mx-1">&rarr;</span> {sub.endDate}</div>
                        </div>
                        <div className="text-left">
                          <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                            {sub.status === 'active' ? 'نشط' : 'منتهي'}
                          </Badge>
                          {sub.amount > 0 && <div className="text-xs font-mono mt-1">{sub.amount} د.ب</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">لا يوجد سجل اشتراكات</div>
                  );
                })()}
              </div>
            </div>

            {/* Right: New Subscription Form */}
            <div className="space-y-4 border-r pr-6">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                تجديد / اشتراك جديد
              </h3>

              <form onSubmit={handleSubscriptionSubmit} className="space-y-4 p-4 border rounded-lg bg-card shadow-sm">
                <div className="space-y-2">
                  <Label>اختر الباقة</Label>
                  <Select
                    value={newSubscriptionData.packageId}
                    onValueChange={(val) => {
                      const pkg = packages?.find(p => p.id === val);
                      if (pkg) setNewSubscriptionData({ ...newSubscriptionData, packageId: val, duration: pkg.duration });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الاشتراك..." />
                    </SelectTrigger>
                    <SelectContent>
                      {packages?.map(pkg => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} ({pkg.duration} يوم) - {pkg.price} د.ب
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>تاريخ البدء</Label>
                  <Input
                    type="date"
                    value={newSubscriptionData.startDate}
                    onChange={(e) => setNewSubscriptionData({ ...newSubscriptionData, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>طريقة الدفع</Label>
                  <Select
                    value={newSubscriptionData.paymentMethod}
                    onValueChange={(val) => setNewSubscriptionData({ ...newSubscriptionData, paymentMethod: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقداً (Cash)</SelectItem>
                      <SelectItem value="card">بطاقة (Card)</SelectItem>
                      <SelectItem value="transfer">تحويل بنكي (Transfer)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full" disabled={createSubscription.isPending}>
                    {createSubscription.isPending ? "جاري التجديد..." : "تأكيد الاشتراك وتحديث الحالة"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div >

  );
}
