import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, UserPlus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Member, InsertMember } from "@shared/schema";

export default function Members() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertMember>>({
    name: "",
    memberId: "",
    phone: "",
    age: undefined,
    healthNotes: "",
    status: "active",
    balance: 0,
  });

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const createMember = useMutation({
    mutationFn: async (data: InsertMember) => {
      const response = await apiRequest("POST", "/api/members", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      setFormData({
        name: "",
        memberId: "",
        phone: "",
        age: undefined,
        healthNotes: "",
        status: "active",
        balance: 0,
      });
      toast({
        title: "تم بنجاح",
        description: "تم إضافة العضو الجديد بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة العضو",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.memberId || !formData.phone) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    createMember.mutate(formData as InsertMember);
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
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            نشط
          </Badge>
        );
      case "expired":
        return <Badge variant="destructive">منتهي</Badge>;
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            قيد الانتظار
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Card>
          <CardContent className="p-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
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
                    data-testid="input-member-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberId">رقم العضوية *</Label>
                  <Input
                    id="memberId"
                    placeholder="#1050"
                    value={formData.memberId}
                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                    data-testid="input-member-id"
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
                    data-testid="input-member-phone"
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
                    data-testid="input-member-age"
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
                  data-testid="input-member-health"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMember.isPending} data-testid="button-submit-member">
                {createMember.isPending ? "جاري الإضافة..." : "إضافة العضو"}
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
                placeholder="بحث بالاسم / رقم العضوية / الجوال"
                className="pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-members"
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
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الجوال</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">بداية الاشتراك</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">نهاية الاشتراك</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers && filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b last:border-0 hover-elevate" data-testid={`row-member-${member.id}`}>
                      <td className="py-3 px-3 font-medium">{member.name}</td>
                      <td className="py-3 px-3 text-muted-foreground">#{member.memberId}</td>
                      <td className="py-3 px-3">{member.phone}</td>
                      <td className="py-3 px-3">{member.subscriptionStart ?? "-"}</td>
                      <td className="py-3 px-3">{member.subscriptionEnd ?? "-"}</td>
                      <td className="py-3 px-3">{getStatusBadge(member.status)}</td>
                      <td className="py-3 px-3">{member.balance?.toFixed(2) ?? "0.00"} د.ب</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {searchQuery ? "لا توجد نتائج للبحث" : "لا يوجد أعضاء حالياً"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
