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
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Package,
  Receipt,
  Pencil,
  Trash2,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { FinanceReport, Expense, InsertExpense, Subscription, Sale } from "@shared/schema";

const expenseCategories = [
  { value: "rent", label: "إيجار" },
  { value: "salaries", label: "رواتب" },
  { value: "utilities", label: "فواتير خدمات" },
  { value: "equipment", label: "معدات" },
  { value: "maintenance", label: "صيانة" },
  { value: "marketing", label: "تسويق" },
  { value: "other", label: "أخرى" },
];

export default function Finance() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertExpense>>({
    category: "other",
    description: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
  });

  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: sales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  // ... (keep existing subscriptions/sales queries)

  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const createExpense = useMutation({
    mutationFn: async (data: InsertExpense) => {
      const response = await apiRequest("POST", "/api/expenses", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "تم بنجاح", description: "تم إضافة المصروف بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء إضافة المصروف" });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertExpense> }) => {
      const response = await apiRequest("PATCH", `/api/expenses/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "تم بنجاح", description: "تم تعديل المصروف بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل تعديل المصروف" });
    }
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "تم الحذف", description: "تم حذف المصروف بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل حذف المصروف" });
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      category: "other",
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
    });
  };

  const openEditDialog = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      category: expense.category,
      description: expense.description || "",
      amount: expense.amount,
      date: expense.date,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateExpense.mutate({ id: editingId, data: formData });
    } else {
      createExpense.mutate(formData as InsertExpense);
    }
  };

  // ... (keep calculations)

  const totalSubscriptionIncome = subscriptions?.reduce((sum, sub) => sum + sub.amount, 0) ?? 0;
  const activeSales = sales?.filter((sale) => sale.status !== "cancelled") ?? [];
  const totalSalesIncome = activeSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const totalIncome = totalSubscriptionIncome + totalSalesIncome;
  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) ?? 0;
  const netProfit = totalIncome - totalExpenses;

  const expensesByCategory = expenseCategories.map((cat) => ({
    category: cat.label,
    total: expenses?.filter((e) => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0) ?? 0,
  })).filter((c) => c.total > 0);

  const getCategoryLabel = (value: string) => {
    return expenseCategories.find((c) => c.value === value)?.label ?? value;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ar-BH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  if (loadingExpenses) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-24" />))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">التقارير المالية</h1>
          <p className="text-sm text-muted-foreground">ملخص الإيرادات والمصروفات</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-add-expense">
              <Plus className="h-4 w-4 ml-2" />
              إضافة مصروف
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {editingId ? "تعديل المصروف" : "تسجيل مصروف جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger data-testid="select-expense-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الوصف</Label>
                <Input
                  placeholder="وصف المصروف..."
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="input-expense-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المبلغ (د.ب) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                    }
                    data-testid="input-expense-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    data-testid="input-expense-date"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createExpense.isPending || updateExpense.isPending}
                data-testid="button-submit-expense"
              >
                {createExpense.isPending || updateExpense.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ... (Keep Stat Cards same as original) ... */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">دخل الاشتراكات</p>
                <p className="text-2xl font-bold" data-testid="text-subscription-income">
                  {totalSubscriptionIncome.toFixed(2)} د.ب
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">دخل المبيعات</p>
                <p className="text-2xl font-bold" data-testid="text-sales-income">
                  {totalSalesIncome.toFixed(2)} د.ب
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                <p className="text-2xl font-bold" data-testid="text-total-expenses">
                  {totalExpenses.toFixed(2)} د.ب
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${netProfit >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                {netProfit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صافي الربح</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-net-profit">
                  {netProfit.toFixed(2)} د.ب
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">تفصيل المصروفات حسب الفئة</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <div className="space-y-4">
                {expensesByCategory.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium">{cat.category}</span>
                    <Badge variant="secondary">{cat.total.toFixed(2)} د.ب</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                لا توجد مصروفات مسجلة
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">آخر المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">الفئة</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">الوصف</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">المبلغ</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">التاريخ</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses && expenses.length > 0 ? (
                    expenses.slice(0, 10).map((expense) => (
                      <tr key={expense.id} className="border-b last:border-0" data-testid={`row-expense-${expense.id}`}>
                        <td className="py-2 px-2">
                          <Badge variant="secondary">{getCategoryLabel(expense.category)}</Badge>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground max-w-[150px] truncate">
                          {expense.description || "-"}
                        </td>
                        <td className="py-2 px-2 font-medium">{expense.amount.toFixed(2)} د.ب</td>
                        <td className="py-2 px-2 text-muted-foreground">{formatDate(expense.date)}</td>
                        <td className="py-2 px-2 flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('حذف هذا المصروف؟')) deleteExpense.mutate(expense.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        لا توجد مصروفات مسجلة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            ملخص مالي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">إجمالي الإيرادات</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {totalIncome.toFixed(2)} د.ب
              </p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>الاشتراكات:</span>
                  <span>{totalSubscriptionIncome.toFixed(2)} د.ب</span>
                </div>
                <div className="flex justify-between">
                  <span>المبيعات:</span>
                  <span>{totalSalesIncome.toFixed(2)} د.ب</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">إجمالي المصروفات</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {totalExpenses.toFixed(2)} د.ب
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {expenses?.length ?? 0} عملية مسجلة
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">صافي الربح</p>
              <p className={`text-3xl font-bold ${netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {netProfit.toFixed(2)} د.ب
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}٪ هامش ربح
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
