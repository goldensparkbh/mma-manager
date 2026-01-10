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
import { ImagePlus, Plus, Search, Trash2, UserPlus, Award } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Member, InsertMember, Belt, MemberBelt, InsertMemberBelt } from "@shared/schema";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Members() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [awardBeltId, setAwardBeltId] = useState("");

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Partial<InsertMember>>({
    name: "",
    memberId: "",
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
      const response = await apiRequest("POST", "/api/members", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      setImagePreview(null);
      setImageFile(null);
      setFormData({
        name: "",
        memberId: "",
        phone: "",
        age: undefined,
        healthNotes: "",
        status: "active",
        balance: 0,
      });
      toast({ title: "تم بنجاح", description: "تم إضافة العضو الجديد بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء إضافة العضو" });
    },
  });

  const awardBelt = useMutation({
    mutationFn: async ({ memberId, beltId }: { memberId: string; beltId: string }) => {
      const data: InsertMemberBelt = { memberId, beltId };
      const response = await apiRequest("POST", "/api/member-belts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member-belts"] });
      setIsAwardDialogOpen(false);
      setAwardBeltId("");
      toast({ title: "تم بنجاح", description: "تم منح الحزام للعضو" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message || "فشل منح الحزام" });
    },
  });

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.memberId || !formData.phone) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }
    createMember.mutate({ ...(formData as InsertMember), imageFile });
  };

  const handleAwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId && awardBeltId) {
      awardBelt.mutate({ memberId: selectedMemberId, beltId: awardBeltId });
    }
  };

  const getMemberBeltsBadges = (memberId: string) => {
    const earned = memberBelts?.filter(mb => mb.memberId === memberId) || [];
    // Sort by belt order? Ideally yes if belts have order.
    // For now, map simple badges.
    const badges = earned.map(mb => {
      const belt = belts?.find(b => b.id === mb.beltId);
      if (!belt) return null;
      return { ...belt, memberBeltId: mb.id };
    }).filter(Boolean) as (Belt & { memberBeltId: string })[];

    // Sort by order
    badges.sort((a, b) => (a.order || 0) - (b.order || 0));

    return badges.map(b => (
      <div
        key={b.memberBeltId}
        className="w-5 h-5 rounded-full border border-border shadow-sm"
        style={{ backgroundColor: b.color }}
        title={b.name}
      />
    ));
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Card><CardContent className="p-6"><Skeleton className="h-12 w-full mb-2" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">إدارة الأعضاء</h1>
          <p className="text-sm text-muted-foreground">إضافة وإدارة أعضاء النادي</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                تسجيل عضو جديد
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم العضو *</Label>
                  <Input
                    id="name"
                    placeholder="مثال: أحمد علي"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberId">رقم العضوية *</Label>
                  <Input
                    id="memberId"
                    placeholder="#1050"
                    value={formData.memberId}
                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer flex-1">
                    <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">اختر صورة</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                  {imagePreview && (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border">
                      <img src={imagePreview} alt="معاينة" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFile(null);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMember.isPending}>
                {createMember.isPending ? "جاري الإضافة..." : "إضافة العضو"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Award Belt Dialog */}
        <Dialog open={isAwardDialogOpen} onOpenChange={setIsAwardDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>منح حزام للعضو</DialogTitle></DialogHeader>
            <form onSubmit={handleAwardSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>اختر الحزام</Label>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base">قائمة الأعضاء</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                className="pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">العضو</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">رقم العضوية</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الأحزمة</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">انتهاء الاشتراك</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الرصيد</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers && filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b last:border-0 hover-elevate">
                      <td className="py-3 px-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.imageUrl ?? undefined} alt={member.name} />
                            <AvatarFallback>
                              {member.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">#{member.memberId}</td>
                      <td className="py-3 px-3">
                        <div className="flex -space-x-1 items-center flex-wrap gap-1">
                          {getMemberBeltsBadges(member.id)}
                        </div>
                      </td>
                      <td className="py-3 px-3">{member.subscriptionEnd ?? "-"}</td>
                      <td className="py-3 px-3">{getStatusBadge(member.status)}</td>
                      <td className="py-3 px-3">{member.balance?.toFixed(2) ?? "0.00"} د.ب</td>
                      <td className="py-3 px-3">
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
                          منح حزام
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">لا توجد نتائج</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
