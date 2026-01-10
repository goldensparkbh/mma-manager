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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, CreditCard, Search, Settings, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Subscription, Member, InsertSubscription, SubscriptionPackage, InsertSubscriptionPackage } from "@shared/schema";

export default function Subscriptions() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);

  // Subscriptions State
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

  // Packages State
  const [packageFormData, setPackageFormData] = useState<Partial<InsertSubscriptionPackage>>({
    name: "",
    price: 0,
    duration: 30,
  });

  // Queries
  const { data: subscriptions, isLoading: isSubsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: members } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: packages = [], isLoading: isPackagesLoading } = useQuery<SubscriptionPackage[]>({
    queryKey: ["/api/packages"],
  });

  // Mutations
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

  const createPackage = useMutation({
    mutationFn: async (data: InsertSubscriptionPackage) => {
      const response = await apiRequest("POST", "/api/packages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setIsPackageDialogOpen(false);
      setPackageFormData({ name: "", price: 0, duration: 30 });
      toast({ title: "تم بنجاح", description: "تم إضافة الباقة بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "تعذر إضافة الباقة" });
    }
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({ title: "تم بنجاح", description: "تم حذف الباقة" });
    }
  });

  // Handlers
  const handleMemberChange = (memberId: string) => {
    const member = members?.find((m) => m.id === memberId);
    setFormData({
      ...formData,
      memberId,
      memberName: member?.name ?? "",
    });
  };

  const handlePlanChange = (planName: string) => {
    const plan = packages.find((p) => p.name === planName);
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

  const handleSubmitSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.memberId || !formData.planName) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }
    createSubscription.mutate(formData as InsertSubscription);
  };

  const handleSubmitPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageFormData.name || !packageFormData.price) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }
    createPackage.mutate(packageFormData as InsertSubscriptionPackage);
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

  if (isSubsLoading && activeTab === "subscriptions") {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الاشتراكات</h1>
          <p className="text-sm text-muted-foreground">إدارة اشتراكات الأعضاء والباقات</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
          <TabsTrigger value="subscriptions">سجل الاشتراكات</TabsTrigger>
          <TabsTrigger value="packages">إعدادات الباقات</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Subscriptions Actions */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                className="pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  اشتراك جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>تسجيل اشتراك جديد</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitSubscription} className="space-y-4">
                  <div className="space-y-2">
                    <Label>العضو</Label>
                    <Select value={formData.memberId} onValueChange={handleMemberChange}>
                      <SelectTrigger>
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
                    <Label>الباقة</Label>
                    <Select value={formData.planName} onValueChange={handlePlanChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الباقة..." />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((plan) => (
                          <SelectItem key={plan.id} value={plan.name}>
                            {plan.name} ({plan.duration} يوم) - {plan.price} د.ب
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {packages.length === 0 && (
                      <p className="text-xs text-destructive">لا توجد باقات. يرجى إضافتها من تبويب "إعدادات الباقات".</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>البداية</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => {
                          // Date logic update
                          const startDate = e.target.value;
                          const plan = packages.find((p) => p.name === formData.planName);
                          if (plan) {
                            const endDate = new Date(startDate);
                            endDate.setDate(endDate.getDate() + plan.duration);
                            setFormData({ ...formData, startDate, endDate: endDate.toISOString().split("T")[0] });
                          } else {
                            setFormData({ ...formData, startDate });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>النهاية</Label>
                      <Input type="date" value={formData.endDate} disabled className="bg-muted" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المبلغ</Label>
                      <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الدفع</Label>
                      <Select
                        value={formData.paymentMethod}
                        onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">نقداً</SelectItem>
                          <SelectItem value="card">بطاقة</SelectItem>
                          <SelectItem value="transfer">تحويل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createSubscription.isPending}>
                    {createSubscription.isPending ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">جميع الاشتراكات</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right py-3 px-3">العضو</th>
                    <th className="text-right py-3 px-3">الباقة</th>
                    <th className="text-right py-3 px-3">المبلغ</th>
                    <th className="text-right py-3 px-3">البداية</th>
                    <th className="text-right py-3 px-3">النهاية</th>
                    <th className="text-right py-3 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions?.length ? filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b">
                      <td className="py-3 px-3 font-medium">{sub.memberName}</td>
                      <td className="py-3 px-3">{sub.planName}</td>
                      <td className="py-3 px-3">{sub.amount} د.ب</td>
                      <td className="py-3 px-3">{sub.startDate}</td>
                      <td className="py-3 px-3">{sub.endDate}</td>
                      <td className="py-3 px-3">{getStatusBadge(sub.status, sub.endDate)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد بيانات</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">باقات الاشتراك المتاحة</h3>
            <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة باقة
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>إضافة باقة جديدة</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmitPackage} className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم الباقة</Label>
                    <Input
                      placeholder="مثال: اشتراك شهري"
                      value={packageFormData.name}
                      onChange={(e) => setPackageFormData({ ...packageFormData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المدة (بالأيام)</Label>
                      <Input
                        type="number"
                        value={packageFormData.duration}
                        onChange={(e) => setPackageFormData({ ...packageFormData, duration: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>السعر (د.ب)</Label>
                      <Input
                        type="number"
                        value={packageFormData.price}
                        onChange={(e) => setPackageFormData({ ...packageFormData, price: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    حفظ الباقة
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <Card key={pkg.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{pkg.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذه الباقة؟")) {
                        deletePackage.mutate(pkg.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pkg.price} د.ب</div>
                  <p className="text-xs text-muted-foreground">صلاحية {pkg.duration} يوم</p>
                </CardContent>
              </Card>
            ))}
            {packages.length === 0 && (
              <div className="col-span-3 text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                لا توجد باقات حالياً. ابدأ بإضافة باقة جديدة.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
