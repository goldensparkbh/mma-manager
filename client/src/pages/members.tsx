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
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Plus, Search, Trash2, UserPlus, Award, Printer, X, Pencil } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Member, InsertMember, Belt, MemberBelt, InsertMemberBelt } from "@shared/schema";
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
  const [cardMember, setCardMember] = useState<Member | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Partial<InsertMember>>({
    name: "",
    // memberId removed
    phone: "",
    age: undefined,
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

  // Mutations
  const createMember = useMutation({
    mutationFn: async (data: InsertMember & { imageFile?: File | null }) => {
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertMember> & { imageFile?: File | null } }) => {
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

  // Handlers
  const resetForm = () => {
    setImagePreview(null);
    setImageFile(null);
    setEditingMemberId(null);
    setFormData({
      name: "",
      phone: "",
      age: undefined,
      healthNotes: "",
      status: "active",
      balance: 0,
    });
  };

  const openEditDialog = (member: Member) => {
    setEditingMemberId(member.id);
    setFormData({
      name: member.name,
      phone: member.phone,
      age: member.age || undefined,
      healthNotes: member.healthNotes || "",
      status: member.status,
      balance: member.balance || 0,
    });
    setImagePreview(member.imageUrl || null);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }

    if (editingMemberId) {
      updateMember.mutate({ id: editingMemberId, data: { ...formData, imageFile } });
    } else {
      createMember.mutate({ ...(formData as InsertMember), memberId: "temp", imageFile });
    }
  };

  const handleAwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId && awardBeltId) {
      awardBelt.mutate({ memberId: selectedMemberId, beltId: awardBeltId });
    }
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
    (member) =>
      member.name.includes(searchQuery) ||
      member.memberId.includes(searchQuery) ||
      member.phone.includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">نشط</Badge>;
      case "expired":
        return <Badge variant="destructive">منتهي</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">قيد الانتظار</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-member">
              <Plus className="h-4 w-4 ml-2" />
              إضافة عضو جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {editingMemberId ? "تعديل بيانات العضو" : "تسجيل عضو جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم العضو *</Label>
                <Input
                  id="name"
                  placeholder="مثال: أحمد علي"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الجوال *</Label>
                  <Input
                    id="phone"
                    placeholder="33xxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">العمر</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="18"
                    value={formData.age ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : undefined })
                    }
                  />
                </div>
              </div>
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
                <Label>صورة العضو</Label>
                {/* Upload input ... (reused from existing) */}
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer flex-1">
                    <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">اختر صورة</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  {imagePreview && (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border">
                      <img src={imagePreview} alt="معاينة" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMember.isPending || updateMember.isPending}>
                {createMember.isPending || updateMember.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Manage Belts Dialog */}
        <Dialog open={isAwardDialogOpen} onOpenChange={setIsAwardDialogOpen}>
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
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">قائمة الأعضاء</CardTitle>
          {/* Search Input handled above */}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right py-3 px-3">العضو</th>
                  <th className="text-right py-3 px-3">رقم العضوية</th>
                  <th className="text-right py-3 px-3">بداية الاشتراك</th>
                  <th className="text-right py-3 px-3">نهاية الاشتراك</th>
                  <th className="text-right py-3 px-3">الأحزمة</th>
                  <th className="text-right py-3 px-3">الحالة</th>
                  <th className="text-right py-3 px-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers && filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => {
                    const isExpired = member.subscriptionEnd ? new Date(member.subscriptionEnd) < new Date() : false;
                    const status = isExpired ? "expired" : member.status;

                    return (
                      <tr key={member.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-3 font-medium text-right">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8"><AvatarImage src={member.imageUrl || undefined} /><AvatarFallback>{member.name[0]}</AvatarFallback></Avatar>
                            <span>{member.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">#{member.memberId}</td>
                        <td className="py-3 px-3 text-right text-muted-foreground">{member.subscriptionStart || "-"}</td>
                        <td className="py-3 px-3 text-right font-medium">{member.subscriptionEnd || "-"}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex -space-x-1">
                            {getMemberBeltsBadges(member.id).map(b => (
                              <div key={b.memberBeltId} className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: b.color }} title={b.name} />
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">{getStatusBadge(status)}</td>
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
                          >
                            <Award className="h-3 w-3" />
                            الأحزمة
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
                  <img src={clubSettings?.logoUrlDark || clubSettings?.logoUrlLight || "/logo_dark_icon.svg"} alt="Logo" className="w-16 h-16 object-contain opacity-90 mb-2" />
                  <h2 className="text-2xl font-black tracking-widest uppercase text-center leading-tight">
                    {clubSettings?.name.split(' ')[0] || "Kumite"}
                  </h2>
                  <p className="text-xs text-red-500 font-bold uppercase tracking-[0.3em] text-center">
                    {clubSettings?.name.split(' ').slice(1).join(' ') || "Combat"}
                  </p>
                </div>

                {/* Avatar */}
                <div className="w-32 h-32 rounded-full border-4 border-neutral-800 shadow-xl overflow-hidden mb-6 bg-neutral-700">
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
                <div className="mt-auto w-full pt-4 border-t border-white/10 flex justify-between items-end">
                  <div className="text-left">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold">Member Since</p>
                    <p className="text-xs font-mono">{new Date().getFullYear()}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="w-8 h-8 bg-white rounded-sm p-0.5">
                      <div className="w-full h-full bg-black/90"></div>
                    </div>
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
    </div>
  );
}
