import { useMemo, useState } from "react";
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
import { useLanguage } from "@/context/language-context";
import { endOfDay, isAfter, isBefore, parseISO, startOfDay } from "date-fns";

export default function Subscriptions() {
  const { role, clubSettings } = useAuth();
  const { t, language } = useLanguage();
  const isAdmin = role === "admin";
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<Subscription | null>(null);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

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
      toast({ title: t("common.success"), description: t("subscriptions.createSuccess") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("common.error"), description: t("subscriptions.createError") });
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
      toast({ title: t("common.success"), description: t("subscriptions.updateSuccess") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("common.error"), description: t("subscriptions.updateError") });
    }
  });

  const deleteSubscription = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: t("common.success"), description: t("subscriptions.deleteSuccess") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("common.error"), description: t("subscriptions.deleteError") });
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
      setEditingPackageId(null);
      resetPackageForm();
      toast({ title: t("common.success"), description: t("subscriptions.packageCreateSuccess") });
    },
  });

  const updatePackage = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSubscriptionPackage> }) => {
      const response = await apiRequest("PATCH", `/api/packages/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setIsPackageDialogOpen(false);
      setEditingPackageId(null);
      resetPackageForm();
      toast({ title: t("common.success"), description: t("subscriptions.packageUpdateSuccess") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("common.error"), description: t("subscriptions.packageUpdateError") });
    }
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({ title: t("common.success"), description: t("subscriptions.packageDeleteSuccess") });
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
        startDate,
        endDate: endDate.toISOString().split("T")[0],
      });
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    const plan = packages.find((p) => p.name === formData.planName);

    let newEndDate = formData.endDate;
    if (plan && newStartDate) {
      const endDate = new Date(newStartDate);
      endDate.setDate(endDate.getDate() + plan.duration);
      newEndDate = endDate.toISOString().split("T")[0];
    }

    setFormData({
      ...formData,
      startDate: newStartDate,
      endDate: newEndDate,
    });
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

  const resetPackageForm = () => {
    setPackageFormData({ name: "", price: 0, duration: 30 });
  };

  const openCreatePackageDialog = () => {
    setEditingPackageId(null);
    resetPackageForm();
    setIsPackageDialogOpen(true);
  };

  const openEditPackageDialog = (pkg: SubscriptionPackage) => {
    setEditingPackageId(pkg.id);
    setPackageFormData({ name: pkg.name, price: pkg.price, duration: pkg.duration });
    setIsPackageDialogOpen(true);
  };

  const handlePackageDialogChange = (open: boolean) => {
    setIsPackageDialogOpen(open);
    if (!open) {
      setEditingPackageId(null);
      resetPackageForm();
    }
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
    if (hasOverlap) {
      toast({ variant: "destructive", title: t('common.error'), description: t('subscriptions.overlapWarning') });
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
    if (!packageFormData.name || !packageFormData.duration) return;
    if (editingPackageId) {
      updatePackage.mutate({ id: editingPackageId, data: packageFormData });
      return;
    }
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

  const hasOverlap = useMemo(() => {
    if (!formData.memberId || !formData.startDate || !formData.endDate) return false;
    try {
      const selectedStart = startOfDay(parseISO(formData.startDate));
      const selectedEnd = endOfDay(parseISO(formData.endDate));
      return (subscriptions ?? []).some((sub) => {
        if (sub.memberId !== formData.memberId) return false;
        if (editingSubId && sub.id === editingSubId) return false;
        if (!sub.startDate || !sub.endDate) return false;
        const subStart = startOfDay(parseISO(sub.startDate));
        const subEnd = endOfDay(parseISO(sub.endDate));
        return selectedStart <= subEnd && selectedEnd >= subStart;
      });
    } catch {
      return false;
    }
  }, [formData.memberId, formData.startDate, formData.endDate, subscriptions, editingSubId]);

  const getSubscriptionDisplayStatus = (sub: Subscription) => {
    if (!sub.startDate || !sub.endDate) return sub.status || "active";
    try {
      const now = startOfDay(new Date());
      const start = startOfDay(parseISO(sub.startDate));
      const end = endOfDay(parseISO(sub.endDate));
      if (isBefore(now, start)) return "upcoming";
      if (isAfter(now, end)) return "expired";
      return "active";
    } catch {
      return sub.status || "active";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header ... */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tabs List */}
        <TabsList className="mb-8">
          <TabsTrigger value="subscriptions">{t('subscriptions.tabs.history')}</TabsTrigger>
          <TabsTrigger value="packages">{t('subscriptions.tabs.packages')}</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("common.search")} className="pr-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild><Button>{t('subscriptions.newSubscription')}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingSubId ? t('subscriptions.editSubscription') : t('subscriptions.newSubscription')}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmitSubscription} className="space-y-4">
                  {/* Form Fields - Member, Plan, Dates... same as before plus Payment Status */}
                  <div className="space-y-2">
                    <Label>{t('subscriptions.member')}</Label>
                    <Select value={formData.memberId} onValueChange={(v) => {
                      const m = members?.find(m => m.id === v);
                      setFormData({ ...formData, memberId: v, memberName: m?.name });
                    }}>
                      <SelectTrigger><SelectValue placeholder={t('members.selectMember')} /></SelectTrigger>
                      <SelectContent>
                        {members?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('subscriptions.package')}</Label>
                    <Select value={formData.planName} onValueChange={handlePlanChange}>
                      <SelectTrigger><SelectValue placeholder={t('subscriptions.selectPackage')} /></SelectTrigger>
                      <SelectContent>
                        {packages.map(p => <SelectItem key={p.id} value={p.name}>{p.name} - {p.price} {t("common.currency")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('subscriptions.startDate')}</Label>
                      <Input type="date" value={formData.startDate} onChange={handleStartDateChange} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('subscriptions.endDate')}</Label>
                      <Input type="date" value={formData.endDate} disabled className="bg-muted text-muted-foreground" />
                    </div>
                  </div>

                  {/* Payment Status Field */}
                  <div className="space-y-2">
                    <Label>{t('subscriptions.paymentStatus')}</Label>
                    <Select value={formData.paymentStatus} onValueChange={(v: any) => setFormData({ ...formData, paymentStatus: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">{t('subscriptions.paid')}</SelectItem>
                        <SelectItem value="pending">{t('subscriptions.pending')}</SelectItem>
                        <SelectItem value="unpaid">{t('subscriptions.unpaid')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createSubscription.isPending || updateSubscription.isPending || hasOverlap}
                  >
                    {createSubscription.isPending || updateSubscription.isPending
                      ? t('common.loading')
                      : hasOverlap
                        ? t('subscriptions.overlapButton')
                        : t('common.save')}
                  </Button>
                  {hasOverlap && (
                    <p className="text-xs text-destructive">{t('subscriptions.overlapWarning')}</p>
                  )}
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm" dir="${language === 'ar' ? 'rtl' : 'ltr'}">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-4 text-right">{t('subscriptions.member')}</th>
                    <th className="p-4 text-right">{t('subscriptions.package')}</th>
                    <th className="p-4 text-right">{t('common.amount')}</th>
                    <th className="p-4 text-right">{t('common.date')}</th>
                    <th className="p-4 text-right">{t('members.status')}</th>
                    <th className="p-4 text-right">{t('subscriptions.paymentStatus')}</th>
                    <th className="p-4 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions?.map(sub => (
                    <tr key={sub.id} className="border-b">
                      <td className="p-4 text-right">{sub.memberName}</td>
                      <td className="p-4 text-right">{sub.planName}</td>
                      <td className="p-4 font-bold text-right">{sub.amount} {t("common.currency")}</td>
                      <td className="p-4 text-xs text-muted-foreground text-right">{sub.startDate} <br /> {sub.endDate}</td>
                      <td className="p-4 text-right">
                        {(() => {
                          const status = getSubscriptionDisplayStatus(sub);
                          if (status === "active") {
                            return <Badge className="bg-green-100 text-green-800">{t('common.active')}</Badge>;
                          }
                          if (status === "upcoming") {
                            return <Badge variant="outline" className="border-blue-500 text-blue-600">{t('common.upcoming')}</Badge>;
                          }
                          return <Badge variant="secondary">{t('common.expired')}</Badge>;
                        })()}
                      </td>
                      <td className="p-4 text-right">
                        {sub.paymentStatus === 'paid' && <Badge variant="outline" className="border-green-500 text-green-600 gap-1"><CheckCircle className="w-3 h-3" /> {t('subscriptions.paid')}</Badge>}
                        {sub.paymentStatus === 'pending' && <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1"><Clock className="w-3 h-3" /> {t('subscriptions.pending')}</Badge>}
                        {sub.paymentStatus === 'unpaid' && <Badge variant="outline" className="border-red-500 text-red-600 gap-1"><XCircle className="w-3 h-3" /> {t('subscriptions.unpaid')}</Badge>}
                      </td>
                      <td className="p-4 text-right flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8" onClick={() => printReceipt(sub)} title={t('common.print')}>
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(sub)} title={t('common.edit')}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                            if (confirm(t("subscriptions.confirmDelete"))) deleteSubscription.mutate(sub.id);
                          }} title={t("common.delete")}>
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
            <h3 className="font-semibold">{t("subscriptions.packagesTitle")}</h3>
            <Dialog open={isPackageDialogOpen} onOpenChange={handlePackageDialogChange}>
              <DialogTrigger asChild><Button variant="outline" onClick={openCreatePackageDialog}>{t('subscriptions.addPackage')}</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>{editingPackageId ? t('common.edit') : t('subscriptions.addPackage')}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmitPackage} className="space-y-4">
                  <Input placeholder={t("subscriptions.packageNamePlaceholder")} value={packageFormData.name} onChange={e => setPackageFormData({ ...packageFormData, name: e.target.value })} />
                  <Input type="number" placeholder={t("subscriptions.packageDurationPlaceholder")} value={packageFormData.duration} onChange={e => setPackageFormData({ ...packageFormData, duration: parseInt(e.target.value) })} />
                  <Input type="number" placeholder={t("subscriptions.packagePricePlaceholder")} value={packageFormData.price} onChange={e => setPackageFormData({ ...packageFormData, price: parseFloat(e.target.value) })} />
                  <Button type="submit" className="w-full" disabled={createPackage.isPending || updatePackage.isPending}>{createPackage.isPending || updatePackage.isPending ? t('common.loading') : t('common.save')}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map(p => (
              <Card key={p.id}>
                <CardHeader className="flex flex-row justify-between pb-2">
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditPackageDialog(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePackage.mutate(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{p.price} {t("common.currency")}</div>
                  <p className="text-xs text-muted-foreground">{p.duration} {t("common.days")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Receipt Modal */}
      <Dialog open={!!receiptData} onOpenChange={(open) => !open && setReceiptData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t("subscriptions.receipt")}</DialogTitle></DialogHeader>
          {receiptData && (
            <div className="space-y-6" id="receipt-area">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{clubSettings?.name || t("members.clubFallback")}</h2>
                <p className="text-muted-foreground text-sm">{t("subscriptions.receiptSubtitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("common.date")}: {new Date().toLocaleDateString(language === 'ar' ? 'ar-BH' : 'en-US')}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{t("subscriptions.member")}:</span> <span className="font-medium">{receiptData.memberName}</span></div>
                <div className="flex justify-between"><span>{t("subscriptions.package")}:</span> <span>{receiptData.planName}</span></div>
                <div className="flex justify-between"><span>{t("subscriptions.period")}:</span> <span>{receiptData.startDate} - {receiptData.endDate}</span></div>
                <div className="flex justify-between border-t pt-2 mt-2"><span>{t("common.amount")}:</span> <span className="font-bold text-lg">{receiptData.amount} {t("common.currency")}</span></div>
                <div className="flex justify-between"><span>{t("subscriptions.paymentStatus")}:</span> <span>{receiptData.paymentStatus === 'paid' ? t('subscriptions.paid') : t('subscriptions.unpaid')}</span></div>
              </div>
              <Button className="w-full" onClick={() => {
                const content = document.getElementById('receipt-area')?.innerHTML;
                const printWindow = window.open('', '', 'height=600,width=800');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>${t("subscriptions.receiptTitle")} - ${receiptData.memberName}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                          body { font-family: 'Cairo', sans-serif; }
                          @page { size: 80mm 150mm; margin: 0; }
                        </style>
                      </head>
                      <body class="bg-white p-4" dir="${language === 'ar' ? 'rtl' : 'ltr'}">
                        <div class="max-w-[80mm] mx-auto">
                          <!-- Header -->
                          <div class="flex flex-col items-center mb-6 text-center">
                            ${clubSettings?.logoUrlLight ? `<img src="${clubSettings.logoUrlLight}" class="w-20 h-20 object-contain mb-2" alt="${t("members.logoAlt")}" />` : ''}
                            <h1 class="text-xl font-bold text-gray-900">${clubSettings?.name || t("members.clubFallback")}</h1>
                            <p class="text-xs text-gray-500 mt-1">${new Date().toLocaleDateString(language === 'ar' ? 'ar-BH' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>

                          <!-- Receipt Details -->
                          <div class="border-t-2 border-dashed border-gray-200 py-4 space-y-3">
                             <div class="flex justify-between items-center text-sm">
                              <span class="text-gray-500">${t("subscriptions.receiptNumber")}:</span>
                              <span class="font-mono font-bold">#${receiptData.id.slice(0, 8)}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                              <span class="text-gray-500">${t("subscriptions.member")}:</span>
                              <span class="font-semibold text-gray-900">${receiptData.memberName}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                              <span class="text-gray-500">${t("subscriptions.package")}:</span>
                              <span class="font-semibold text-gray-900">${receiptData.planName}</span>
                            </div>
                             <div class="flex justify-between items-center text-sm">
                              <span class="text-gray-500">${t("common.from")}:</span>
                              <span class="font-mono text-gray-900">${receiptData.startDate}</span>
                            </div>
                             <div class="flex justify-between items-center text-sm">
                              <span class="text-gray-500">${t("common.to")}:</span>
                              <span class="font-mono text-gray-900">${receiptData.endDate}</span>
                            </div>
                          </div>

                          <!-- Totals -->
                          <div class="border-t-2 border-dashed border-gray-200 pt-4 mt-2">
                            <div class="flex justify-between items-center mb-4">
                              <span class="text-base font-bold text-gray-900">${t("subscriptions.totalAmount")}</span>
                              <span class="text-xl font-bold text-gray-900">${receiptData.amount} {t("common.currency")}</span>
                            </div>
                             <div class="flex justify-between items-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                              <span>{t("subscriptions.paymentStatus")}:</span>
                              <span class="font-medium ${receiptData.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}">
                                ${receiptData.paymentStatus === 'paid' ? t('subscriptions.paid') : t('subscriptions.unpaid')}
                              </span>
                            </div>
                          </div>

                          <!-- Footer -->
                          <div class="mt-8 text-center space-y-1">
                             <p class="text-xs text-gray-400">${t("subscriptions.receiptThanks")}</p>
                             <p class="text-[10px] text-gray-300">${t("subscriptions.receiptFooterNote")}</p>
                          </div>
                        </div>
                        <script>
                          window.onload = () => { setTimeout(() => window.print(), 500); };
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }}>
                <Printer className="w-4 h-4 ml-2" /> {t("common.print")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
