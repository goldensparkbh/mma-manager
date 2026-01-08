import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, CreditCard, Search } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Subscription, Member, InsertSubscription } from "@shared/schema";

const plans = [
  { name: "شهري", duration: 30, price: 25 },
  { name: "ربع سنوي", duration: 90, price: 65 },
  { name: "نصف سنوي", duration: 180, price: 120 },
  { name: "سنوي", duration: 365, price: 220 },
];

export default function Subscriptions() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertSubscription>>({
    memberId: "",
    memberName: "",
    planName: "",
    amount: 0,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    status: "active",
    paymentMethod: "cash",
  });

  const { data: subscriptions, isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: members } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const createSubscription = useMutation({
    mutationFn: async (data: InsertSubscription) => {
      const response = await apiRequest("POST", "/api/subscriptions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      setIsDialogOpen(false);
      setFormData({
        memberId: "",
        memberName: "",
        planName: "",
        amount: 0,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        status: "active",
        paymentMethod: "cash",
      });
      toast({
        title: "تم بنجاح",
        description: "تم إضافة الاشتراك بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة الاشتراك",
        variant: "destructive",
      });
    },
  });

  const handleMemberChange = (memberId: string) => {
    const member = members?.find((m) => m.id === memberId);
    setFormData({
      ...formData,
      memberId,
      memberName: member?.name ?? "",
    });
  };

  const handlePlanChange = (planName: string) => {
    const plan = plans.find((p) => p.name === planName);
    if (plan) {
      const startDate = formData.startDate || new Date().toISOString().split("T")[0];
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.duration);
      setFormData({
        ...formData,
        planName,
        amount: plan.price,
        endDate: endDate.toISOString().split("T")[0],
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.memberId || !formData.planName) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    createSubscription.mutate(formData as InsertSubscription);
  };

  const filteredSubscriptions = subscriptions?.filter(
    (sub) =>
      sub.memberName.includes(searchQuery) ||
      sub.memberId.includes(searchQuery) ||
      sub.planName.includes(searchQuery)
  );

  const getStatusBadge = (status: string, endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0 || status === "expired") {
      return <Badge variant="destructive">منتهي</Badge>;
    } else if (diffDays <= 7) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          ينتهي قريباً
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        نشط
      </Badge>
    );
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">الاشتراكات</h1>
          <p className="text-sm text-muted-foreground">إدارة اشتراكات الأعضاء</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-subscription">
              <Plus className="h-4 w-4 ml-2" />
              إضافة اشتراك جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                تسجيل اشتراك جديد
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>اختر العضو *</Label>
                <Select value={formData.memberId} onValueChange={handleMemberChange}>
                  <SelectTrigger data-testid="select-subscription-member">
                    <SelectValue placeholder="اختر العضو..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} (#{member.memberId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>نوع الاشتراك *</Label>
                <Select value={formData.planName} onValueChange={handlePlanChange}>
                  <SelectTrigger data-testid="select-subscription-plan">
                    <SelectValue placeholder="اختر نوع الاشتراك..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.name} value={plan.name}>
                        {plan.name} - {plan.price} د.ب
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاريخ البداية</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      const startDate = e.target.value;
                      const plan = plans.find((p) => p.name === formData.planName);
                      if (plan) {
                        const endDate = new Date(startDate);
                        endDate.setDate(endDate.getDate() + plan.duration);
                        setFormData({
                          ...formData,
                          startDate,
                          endDate: endDate.toISOString().split("T")[0],
                        });
                      } else {
                        setFormData({ ...formData, startDate });
                      }
                    }}
                    data-testid="input-subscription-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الانتهاء</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    disabled
                    className="bg-muted"
                    data-testid="input-subscription-end"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المبلغ (د.ب)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                    }
                    data-testid="input-subscription-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>طريقة الدفع</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                  >
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقداً</SelectItem>
                      <SelectItem value="card">بطاقة</SelectItem>
                      <SelectItem value="transfer">تحويل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createSubscription.isPending}
                data-testid="button-submit-subscription"
              >
                {createSubscription.isPending ? "جاري التسجيل..." : "تسجيل الاشتراك"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <Card key={plan.name}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{plan.name}</p>
              <p className="text-2xl font-bold">{plan.price} د.ب</p>
              <p className="text-xs text-muted-foreground">{plan.duration} يوم</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base">قائمة الاشتراكات</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم / نوع الاشتراك..."
                className="pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-subscriptions"
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
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">نوع الاشتراك</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">المبلغ</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">البداية</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">النهاية</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الدفع</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions && filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b last:border-0 hover-elevate" data-testid={`row-subscription-${sub.id}`}>
                      <td className="py-3 px-3 font-medium">{sub.memberName}</td>
                      <td className="py-3 px-3">{sub.planName}</td>
                      <td className="py-3 px-3">{sub.amount} د.ب</td>
                      <td className="py-3 px-3">{sub.startDate}</td>
                      <td className="py-3 px-3">{sub.endDate}</td>
                      <td className="py-3 px-3">{getStatusBadge(sub.status, sub.endDate)}</td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary">
                          {sub.paymentMethod === "cash"
                            ? "نقداً"
                            : sub.paymentMethod === "card"
                            ? "بطاقة"
                            : "تحويل"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد اشتراكات حالياً"}
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
