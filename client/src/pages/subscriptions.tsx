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
import { Plus, CreditCard, Search, Trash2, Printer, CheckCircle, Clock, XCircle, Pencil } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Subscription, Member, InsertSubscription, SubscriptionPackage, InsertSubscriptionPackage } from "@shared/schema";
import { useAuth } from "@/context/auth-context";

export default function Subscriptions() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<Subscription | null>(null);

  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  // Subscriptions State
  const [formData, setFormData] = useState<Partial<InsertSubscription>>({
    memberId: "",
    memberName: "",
    planName: "",
    amount: 0,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    status: "active",
    paymentStatus: "paid", // Default
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

  const { data: packages = [] } = useQuery<SubscriptionPackage[]>({
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
      // Also refresh members to show updated status
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "تم بنجاح", description: "تم إضافة الاشتراك" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل الإضافة" });
    },
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSubscription> }) => {
      const response = await apiRequest("PATCH", `/api/subscriptions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "تم بنجاح", description: "تم تعديل الاشتراك" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل التعديل" });
    }
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "تم الحذف", description: "تم حذف الاشتراك" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل الحذف" });
    }
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
      toast({ title: "تم بنجاح", description: "تم إضافة الباقة" });
    },
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

  const resetForm = () => {
    setEditingSubId(null);
    setFormData({
      memberId: "",
      memberName: "",
      planName: "",
      amount: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      status: "active",
      paymentStatus: "paid",
      paymentMethod: "cash",
    });
  };

  const openEditDialog = (sub: Subscription) => {
    setEditingSubId(sub.id);
    setFormData({
      memberId: sub.memberId,
      memberName: sub.memberName,
      planName: sub.planName,
      amount: sub.amount,
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: sub.status,
      paymentStatus: sub.paymentStatus || 'paid',
      paymentMethod: sub.paymentMethod || 'cash'
    });
    setIsDialogOpen(true);
  };

  const handleSubmitSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.memberId || !formData.planName) {
      return;
    }
    if (editingSubId) {
      updateSubscription.mutate({ id: editingSubId, data: formData });
    } else {
      createSubscription.mutate(formData as InsertSubscription);
    }
  };

  const handleSubmitPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageFormData.name || !packageFormData.price) return;
    createPackage.mutate(packageFormData as InsertSubscriptionPackage);
  };

  const printReceipt = (sub: Subscription) => {
    setReceiptData(sub);
  };

  const filteredSubscriptions = subscriptions?.filter(
    (sub) =>
      sub.memberName.includes(searchQuery) ||
      sub.memberId.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header ... */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tabs List */}
        <TabsList className="mb-8">
          <TabsTrigger value="subscriptions">سجل الاشتراكات</TabsTrigger>
          <TabsTrigger value="packages">إعدادات الباقات</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث..." className="pr-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild><Button>اشتراك جديد</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingSubId ? "تعديل اشتراك" : "تسجيل اشتراك"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmitSubscription} className="space-y-4">
                  {/* Form Fields - Member, Plan, Dates... same as before plus Payment Status */}
                  <div className="space-y-2">
                    <Label>العضو</Label>
                    <Select value={formData.memberId} onValueChange={(v) => {
                      const m = members?.find(m => m.id === v);
                      setFormData({ ...formData, memberId: v, memberName: m?.name });
                    }}>
                      <SelectTrigger><SelectValue placeholder="اختر العضو" /></SelectTrigger>
                      <SelectContent>
                        {members?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الباقة</Label>
                    <Select value={formData.planName} onValueChange={handlePlanChange}>
                      <SelectTrigger><SelectValue placeholder="اختر الباقة" /></SelectTrigger>
                      <SelectContent>
                        {packages.map(p => <SelectItem key={p.id} value={p.name}>{p.name} - {p.price} د.ب</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>تاريخ البدء</Label>
                      <Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الانتهاء</Label>
                      <Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                    </div>
                  </div>

                  {/* Payment Status Field */}
                  <div className="space-y-2">
                    <Label>حالة الدفع</Label>
                    <Select value={formData.paymentStatus} onValueChange={(v: any) => setFormData({ ...formData, paymentStatus: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">مدفوع</SelectItem>
                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                        <SelectItem value="unpaid">غير مدفوع</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Submit */}
                  <Button type="submit" className="w-full" disabled={createSubscription.isPending || updateSubscription.isPending}>
                    {createSubscription.isPending || updateSubscription.isPending ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm" dir="rtl">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-4 text-right">العضو</th>
                    <th className="p-4 text-right">الباقة</th>
                    <th className="p-4 text-right">المبلغ</th>
                    <th className="p-4 text-right">التاريخ</th>
                    <th className="p-4 text-right">الحالة</th>
                    <th className="p-4 text-right">الدفع</th>
                    <th className="p-4 text-right">اجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions?.map(sub => (
                    <tr key={sub.id} className="border-b">
                      <td className="p-4 text-right">{sub.memberName}</td>
                      <td className="p-4 text-right">{sub.planName}</td>
                      <td className="p-4 font-bold text-right">{sub.amount} د.ب</td>
                      <td className="p-4 text-xs text-muted-foreground text-right">{sub.startDate} <br /> {sub.endDate}</td>
                      <td className="p-4 text-right">
                        {sub.status === 'active' ? <Badge className="bg-green-100 text-green-800">نشط</Badge> : <Badge variant="secondary">غير نشط</Badge>}
                      </td>
                      <td className="p-4 text-right">
                        {sub.paymentStatus === 'paid' && <Badge variant="outline" className="border-green-500 text-green-600 gap-1"><CheckCircle className="w-3 h-3" /> مدفوع</Badge>}
                        {sub.paymentStatus === 'pending' && <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1"><Clock className="w-3 h-3" /> انتظار</Badge>}
                        {sub.paymentStatus === 'unpaid' && <Badge variant="outline" className="border-red-500 text-red-600 gap-1"><XCircle className="w-3 h-3" /> غير مدفوع</Badge>}
                      </td>
                      <td className="p-4 text-right flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8" onClick={() => printReceipt(sub)} title="طباعة">
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(sub)} title="تعديل">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                            if (confirm("حذف الاشتراك؟")) deleteSubscription.mutate(sub.id);
                          }} title="حذف">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold">باقات الاشتراك</h3>
            <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
              <DialogTrigger asChild><Button variant="outline">إضافة باقة</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>إضافة باقة</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmitPackage} className="space-y-4">
                  <Input placeholder="اسم الباقة" value={packageFormData.name} onChange={e => setPackageFormData({ ...packageFormData, name: e.target.value })} />
                  <Input type="number" placeholder="المدة (أيام)" value={packageFormData.duration} onChange={e => setPackageFormData({ ...packageFormData, duration: parseInt(e.target.value) })} />
                  <Input type="number" placeholder="السعر" value={packageFormData.price} onChange={e => setPackageFormData({ ...packageFormData, price: parseFloat(e.target.value) })} />
                  <Button type="submit" className="w-full">حفظ</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map(p => (
              <Card key={p.id}>
                <CardHeader className="flex flex-row justify-between pb-2">
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                  {isAdmin && <Button variant="ghost" size="icon" onClick={() => deletePackage.mutate(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{p.price} د.ب</div>
                  <p className="text-xs text-muted-foreground">{p.duration} يوم</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Receipt Modal */}
      <Dialog open={!!receiptData} onOpenChange={(open) => !open && setReceiptData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>إيصال استلام</DialogTitle></DialogHeader>
          {receiptData && (
            <div className="space-y-6" id="receipt-area">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">Kumite Combat</h2>
                <p className="text-muted-foreground text-sm">إيصال اشتراك</p>
                <p className="text-xs text-muted-foreground mt-1">التاريخ: {new Date().toLocaleDateString('ar-BH')}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>العضو:</span> <span className="font-medium">{receiptData.memberName}</span></div>
                <div className="flex justify-between"><span>الباقة:</span> <span>{receiptData.planName}</span></div>
                <div className="flex justify-between"><span>الفترة:</span> <span>{receiptData.startDate} - {receiptData.endDate}</span></div>
                <div className="flex justify-between border-t pt-2 mt-2"><span>المبلغ:</span> <span className="font-bold text-lg">{receiptData.amount} د.ب</span></div>
                <div className="flex justify-between"><span>حالة الدفع:</span> <span>{receiptData.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}</span></div>
              </div>
              <Button className="w-full" onClick={() => {
                const content = document.getElementById('receipt-area')?.innerHTML;
                const printWindow = window.open('', '', 'height=600,width=800');
                if (printWindow && content) {
                  printWindow.document.write('<html><head><title>Receipt</title>');
                  printWindow.document.write('<style>body{font-family: sans-serif; direction: rtl;} .flex{display:flex; justify-content:space-between;}</style>');
                  printWindow.document.write('</head><body>');
                  printWindow.document.write(content);
                  printWindow.document.write('</body></html>');
                  printWindow.document.close();
                  printWindow.print();
                }
              }}>
                <Printer className="w-4 h-4 ml-2" /> طباعة
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
