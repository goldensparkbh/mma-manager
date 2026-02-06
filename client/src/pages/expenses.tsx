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
    Receipt,
    Pencil,
    Trash2,
    Download,
    Filter
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Expense, InsertExpense } from "@shared/schema";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { PERMISSIONS } from "@/lib/permissions";

const expenseCategories = [
    "rent",
    "salaries",
    "utilities",
    "equipment",
    "maintenance",
    "marketing",
    "other",
];

export default function Expenses() {
    const { hasPermission } = useAuth();
    const { toast } = useToast();
    const { t, language } = useLanguage();
    const canAdd = hasPermission(PERMISSIONS.FINANCE_CREATE);
    const canDelete = hasPermission(PERMISSIONS.FINANCE_DELETE);
    const canUpdate = hasPermission(PERMISSIONS.FINANCE_UPDATE);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<InsertExpense>>({
        category: "other",
        description: "",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Date Filtering State
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
    });

    const setMonthlyCycle = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
        setDateRange({
            startDate: start.toISOString().split("T")[0],
            endDate: end.toISOString().split("T")[0]
        });
    };

    const setYearlyCycle = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        setDateRange({
            startDate: start.toISOString().split("T")[0],
            endDate: end.toISOString().split("T")[0]
        });
    };

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
            toast({ title: t("common.success"), description: t("finance.expenseCreateSuccess") });
        },
        onError: () => {
            toast({ variant: "destructive", title: t("common.error"), description: t("finance.expenseCreateError") });
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
            toast({ title: t("common.success"), description: t("finance.expenseUpdateSuccess") });
        },
        onError: () => {
            toast({ variant: "destructive", title: t("common.error"), description: t("finance.expenseUpdateError") });
        }
    });

    const deleteExpense = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/expenses/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            toast({ title: t("common.success"), description: t("finance.expenseDeleteSuccess") });
        },
        onError: () => {
            toast({ variant: "destructive", title: t("common.error"), description: t("finance.expenseDeleteError") });
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
            toast({ title: t("common.error"), description: t("finance.invalidAmount"), variant: "destructive" });
            return;
        }

        if (editingId) {
            updateExpense.mutate({ id: editingId, data: formData });
        } else {
            createExpense.mutate(formData as InsertExpense);
        }
    };

    const filterByDate = (dateStr: string) => {
        if (!dateStr) return false;
        return dateStr >= dateRange.startDate && dateStr <= dateRange.endDate;
    };

    const filteredExpenses = expenses?.filter(exp => filterByDate(exp.date)) ?? [];

    const getCategoryLabel = (value: string) => {
        const key = `finance.categories.${value}`;
        const label = t(key);
        return label === key ? value : label;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat(language === 'ar' ? 'ar-BH' : 'en-US', {
            year: "numeric",
            month: "short",
            day: "numeric",
        }).format(date);
    };

    const handleExport = () => {
        const csvContent = [
            [t("finance.reportTitle"), `${t("common.from")}: ${dateRange.startDate}`, `${t("common.to")}: ${dateRange.endDate}`],
            [],
            [t("finance.expenseDetails")],
            [t("common.date"), t("finance.category"), t("common.description"), t("common.amount")],
            ...filteredExpenses.map(e => [e.date, getCategoryLabel(e.category), e.description, e.amount]),
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `expenses_report_${dateRange.startDate}_${dateRange.endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loadingExpenses) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t('finance.expensesOnly') || "Expenses"}</h1>
                    <p className="text-sm text-muted-foreground">{t('finance.subtitle')}</p>
                </div>

                <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs">{t("common.from")}</Label>
                        <Input type="date" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} className="h-9 w-36" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">{t("common.to")}</Label>
                        <Input type="date" value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} className="h-9 w-36" />
                    </div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={setMonthlyCycle} className="h-9">{t("common.monthly")}</Button>
                        <Button variant="outline" size="sm" onClick={setYearlyCycle} className="h-9">{t("common.yearly")}</Button>
                        <Button variant="default" size="sm" onClick={handleExport} className="h-9 gap-2">
                            <Download className="w-4 h-4" />
                            {t('common.export')}
                        </Button>
                    </div>
                </div>
                {canAdd && (
                    <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Plus className="h-4 w-4 ml-2" />
                                {t('finance.addExpense')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Receipt className="h-5 w-5" />
                                    {editingId ? t("finance.editExpenseTitle") : t("finance.newExpenseTitle")}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('finance.category')}</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {expenseCategories.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {getCategoryLabel(cat)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("common.description")}</Label>
                                    <Input
                                        placeholder={t("finance.descriptionPlaceholder")}
                                        value={formData.description ?? ""}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('common.amount')} *</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={formData.amount || ""}
                                            onChange={(e) =>
                                                setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("common.date")}</Label>
                                        <Input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={createExpense.isPending || updateExpense.isPending}
                                >
                                    {createExpense.isPending || updateExpense.isPending ? t('common.loading') : t('common.save')}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("finance.latestExpenses")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-start py-2 px-2 font-medium text-muted-foreground">{t('finance.category')}</th>
                                    <th className="text-start py-2 px-2 font-medium text-muted-foreground">{t('common.description')}</th>
                                    <th className="text-start py-2 px-2 font-medium text-muted-foreground">{t('common.amount')}</th>
                                    <th className="text-start py-2 px-2 font-medium text-muted-foreground">{t('common.date')}</th>
                                    <th className="text-start py-2 px-2 font-medium text-muted-foreground">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses && filteredExpenses.length > 0 ? (
                                    filteredExpenses.map((expense) => (
                                        <tr key={expense.id} className="border-b last:border-0">
                                            <td className="py-2 px-2">
                                                <Badge variant="secondary">{getCategoryLabel(expense.category)}</Badge>
                                            </td>
                                            <td className="py-2 px-2 text-muted-foreground max-w-[150px] truncate">
                                                {expense.description || "-"}
                                            </td>
                                            <td className="py-2 px-2 font-medium">{expense.amount.toFixed(2)} {t("common.currency")}</td>
                                            <td className="py-2 px-2 text-muted-foreground">{formatDate(expense.date)}</td>
                                            <td className="py-2 px-2 flex gap-1 justify-end">
                                                {canUpdate && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => openEditDialog(expense)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => {
                                                            if (confirm(t('finance.deleteExpenseConfirm'))) deleteExpense.mutate(expense.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                            {t("finance.noExpenses")}
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
