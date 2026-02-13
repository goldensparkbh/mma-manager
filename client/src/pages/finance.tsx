import { useState, useMemo } from "react";
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
  Calendar as CalendarIcon,
  Download,
  Filter,
  MessageSquare
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { FinanceReport, Expense, InsertExpense, Subscription, Sale, Member } from "@shared/schema";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { WhatsAppTemplateDialog } from "@/components/whatsapp-template-dialog";
import { MemberDetailsDialog } from "@/components/member-details-dialog";
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

export default function Finance() {
  const { hasPermission, clubSettings } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const whatsappTemplates = clubSettings?.whatsappTemplates ?? [];
  const [whatsAppMember, setWhatsAppMember] = useState<Member | null>(null);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);

  // Member Details Dialog State
  const [detailsMember, setDetailsMember] = useState<Member | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState("profile");




  // Date Filtering State
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Ledger State
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState("all");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 50;

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

  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: sales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const { data: members } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });



  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });





  const filterByDate = (dateStr: string) => {
    if (!dateStr) return false;
    return dateStr >= dateRange.startDate && dateStr <= dateRange.endDate;
  };

  const filteredSubscriptions = subscriptions?.filter(sub => {
    const sale = sales?.find(s => s.subscriptionId === sub.id);
    const transactionDate = sale ? sale.date.split("T")[0] : sub.startDate;
    return filterByDate(transactionDate);
  }) ?? [];
  const filteredSales = sales?.filter(sale => filterByDate(sale.date) && sale.status !== "cancelled") ?? [];
  const filteredExpenses = expenses?.filter(exp => filterByDate(exp.date)) ?? [];

  const totalSubscriptionIncome = filteredSubscriptions
    .filter(sub => sub.paymentStatus === 'paid')
    .reduce((sum, sub) => sum + sub.amount, 0);

  const totalSalesIncome = filteredSales
    .filter(sale => sale.paymentStatus === 'paid')
    .reduce((sum, sale) => sum + sale.totalPrice, 0);

  const totalPendingSubscriptions = filteredSubscriptions
    .filter(sub => sub.paymentStatus !== 'paid')
    .reduce((sum, sub) => sum + sub.amount, 0);

  const totalPendingSales = filteredSales
    .filter(sale => sale.paymentStatus !== 'paid')
    .reduce((sum, sale) => sum + sale.totalPrice, 0);

  const totalIncome = totalSubscriptionIncome + totalSalesIncome;
  const totalPending = totalPendingSubscriptions + totalPendingSales;
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const expensesByCategory = expenseCategories.map((cat) => ({
    category: cat,
    total: filteredExpenses.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
  })).filter((c) => c.total > 0);

  const getCategoryLabel = (value: string) => {
    const key = `finance.categories.${value}`;
    const label = t(key);
    return label === key ? value : label;
  };

  const allTransactions = useMemo(() => {
    const subs = filteredSubscriptions.map(s => {
      const sale = sales?.find(sale => sale.subscriptionId === s.id);
      const date = sale ? sale.date.split("T")[0] : (s.createdAt ? s.createdAt.split("T")[0] : s.startDate);
      return {
        id: `sub-${s.id}`,
        date: date,
        type: t("nav.subscriptions"),
        description: `${s.memberName} - ${s.planName}`,
        amount: s.amount,
        status: s.paymentStatus || 'paid',
        isExpense: false,
        memberName: s.memberName
      };
    });

    const sls = filteredSales.map(s => {
      const member = members?.find(m => m.id === s.memberId);
      return {
        id: `sale-${s.id}`,
        date: s.date.split("T")[0],
        type: t("nav.sales"),
        description: s.productName,
        amount: s.totalPrice,
        status: s.paymentStatus || 'paid',
        isExpense: false,
        memberName: member ? `${member.firstName} ${member.lastName}` : (s.buyerName || t("sales.defaultBuyer"))
      };
    });

    const exps = filteredExpenses.map(e => ({
      id: `exp-${e.id}`,
      date: e.date,
      type: t("finance.categories.other"), // Generic expense label
      description: `${getCategoryLabel(e.category)} - ${e.description}`,
      amount: e.amount,
      status: 'paid',
      isExpense: true,
      memberName: "-"
    }));

    return [...subs, ...sls, ...exps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSubscriptions, filteredSales, filteredExpenses, sales, t, members]);

  const filteredLedger = useMemo(() => {
    let result = allTransactions;

    if (ledgerSearch) {
      const lowerSearch = ledgerSearch.toLowerCase();
      result = result.filter(tx =>
        tx.description.toLowerCase().includes(lowerSearch) ||
        tx.type.toLowerCase().includes(lowerSearch) ||
        tx.date.includes(lowerSearch)
      );
    }

    if (ledgerFilter !== 'all') {
      if (ledgerFilter === 'income') result = result.filter(tx => !tx.isExpense && tx.status === 'paid');
      if (ledgerFilter === 'expense') result = result.filter(tx => tx.isExpense);
      if (ledgerFilter === 'unpaid') result = result.filter(tx => tx.status === 'unpaid' || tx.status === 'pending');
      if (ledgerFilter === 'subscriptions') result = result.filter(tx => tx.type === t("nav.subscriptions"));
      if (ledgerFilter === 'sales') result = result.filter(tx => tx.type === t("nav.sales"));
    }

    return result;
  }, [allTransactions, ledgerSearch, ledgerFilter, t]);

  const unpaidItems = useMemo(() => {
    const subs = filteredSubscriptions
      .filter(s => s.paymentStatus !== 'paid')
      .map(s => {
        const sale = sales?.find(sale => sale.subscriptionId === s.id);
        const transactionDate = sale ? sale.date.split("T")[0] : s.startDate;
        return {
          id: `sub-${s.id}`,
          date: s.startDate,
          transactionDate: transactionDate,
          type: t("nav.subscriptions"),
          description: s.planName,
          memberName: s.memberName,
          amount: s.amount,
          status: s.paymentStatus || 'pending'
        };
      });

    const sls = filteredSales
      .filter(s => s.paymentStatus !== 'paid')
      .map(s => {
        const member = members?.find(m => m.id === s.memberId);
        return {
          id: `sale-${s.id}`,
          date: s.date.split("T")[0],
          transactionDate: s.date.split("T")[0],
          type: t("nav.sales"),
          description: s.productName,
          memberName: member ? member.firstName + " " + member.lastName : (s.buyerName || t("sales.defaultBuyer")),
          amount: s.totalPrice,
          status: s.paymentStatus || 'pending'
        };
      });

    return [...subs, ...sls].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSubscriptions, filteredSales, members, sales, t]);

  const totalPages = Math.ceil(filteredLedger.length / ITEMS_PER_PAGE);

  const paginatedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * ITEMS_PER_PAGE;
    return filteredLedger.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLedger, ledgerPage, ITEMS_PER_PAGE]);

  const handleExport = () => {
    const csvContent = [
      [t("finance.reportTitle"), `${t("common.from")}: ${dateRange.startDate}`, `${t("common.to")}: ${dateRange.endDate}`],
      [],
      [t("finance.reportSummary"), t("common.amount")],
      [t("finance.subscriptionIncome"), totalSubscriptionIncome],
      [t("finance.salesIncome"), totalSalesIncome],
      [t("finance.totalIncome"), totalIncome],
      ["Outstanding / Pending", totalPending],
      [t("finance.totalExpenses"), totalExpenses],
      [t("finance.netProfit"), netProfit],
      [],
      [t("finance.expenseDetails")],
      [t("common.date"), t("finance.category"), t("common.description"), t("common.amount")],
      ...filteredExpenses.map(e => [e.date, getCategoryLabel(e.category), e.description, -e.amount]),
      [],
      [t("finance.incomeDetailsSubscriptions")],
      [t("common.date"), t("nav.transactionDate"), t("subscriptions.member"), t("subscriptions.package"), t("common.amount"), t("common.status")],
      ...filteredSubscriptions.map(s => {
        const sale = sales?.find(sale => sale.subscriptionId === s.id);
        const transactionDate = sale ? sale.date.split("T")[0] : s.startDate;
        return [s.startDate, transactionDate, s.memberName, s.planName, s.amount, s.paymentStatus || 'paid'];
      }),
      [],
      [t("finance.incomeDetailsSales")],
      [t("common.date"), t("nav.transactionDate"), t("sales.buyer"), t("sales.product"), t("common.amount"), t("common.status")],
      ...filteredSales.map(s => {
        const member = members?.find(m => m.id === s.memberId);
        const buyerDisplay = member ? `${member.firstName} ${member.lastName}` : (s.buyerName || t("sales.defaultBuyer"));
        return [s.date.split("T")[0], s.date.split("T")[0], buyerDisplay, s.productName, s.totalPrice, s.paymentStatus || 'paid'];
      }),
      [],
      [t("finance.details") || "Full Transaction Ledger"],
      [t("common.date"), t("common.type"), t("members.name") + " / " + t("sales.buyer"), t("common.description"), t("common.amount"), t("common.status")],
      ...allTransactions.map(tx => [
        tx.date,
        tx.type,
        tx.memberName,
        tx.description,
        (tx.isExpense ? "-" : "") + tx.amount.toFixed(2),
        tx.status
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `finance_report_${dateRange.startDate}_${dateRange.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedTransaction = useMemo(() => {
    if (!selectedTransactionId) return null;

    // Split by first hyphen to separate type from ID, which might contain hyphens (UUID)
    const firstHyphenIndex = selectedTransactionId.indexOf("-");
    if (firstHyphenIndex === -1) return null;

    const type = selectedTransactionId.substring(0, firstHyphenIndex);
    const id = selectedTransactionId.substring(firstHyphenIndex + 1);

    if (type === "sub") {
      const sub = subscriptions?.find(s => String(s.id) === id);
      if (!sub) return null;
      return { type: "subscription" as const, data: sub };
    }
    if (type === "sale") {
      const sale = sales?.find(s => String(s.id) === id);
      if (!sale) return null;
      return { type: "sale" as const, data: sale };
    }
    if (type === "exp") {
      const exp = expenses?.find(e => String(e.id) === id);
      if (!exp) return null;
      return { type: "expense" as const, data: exp };
    }
    return null;
  }, [selectedTransactionId, subscriptions, sales, expenses]);

  const handleWhatsAppClick = (phone: string, name: string, memberId?: string) => {
    // Determine if we have a real member or need a mock
    if (memberId) {
      const realMember = members?.find(m => m.id === memberId);
      if (realMember) {
        setWhatsAppMember(realMember);
        setIsWhatsAppDialogOpen(true);
        return;
      }
    }

    // Mock member for guest / missing member
    const mockMember: Member = {
      id: "guest",
      memberId: "guest",
      name: name,
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
      phone: phone,
      status: "active",
      // Add other required fields with dummy values
      email: "",
      gender: "male",
      createdAt: new Date().toISOString(),
    } as Member;

    setWhatsAppMember(mockMember);
    setIsWhatsAppDialogOpen(true);
  };

  const handleMemberClick = (memberId: string, tabValue: string) => {
    const member = members?.find((m) => m.id === memberId);
    if (member) {
      setDetailsMember(member);
      setDetailsTab(tabValue);
      setIsDetailsOpen(true);
    }
  };

  const renderTransactionDetails = () => {
    if (!selectedTransaction) return null;

    if (selectedTransaction.type === "subscription") {
      const sub = selectedTransaction.data;
      const member = members?.find(m => m.id === sub.memberId);
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("subscriptions.member")}</Label>
              <p
                className="font-medium text-base cursor-pointer hover:underline text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMemberClick(sub.memberId, "subscriptions");
                }}
              >
                {sub.memberName}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("members.phone")}</Label>
              {member?.phone ? (
                <div
                  className="flex items-center gap-2 cursor-pointer text-primary hover:underline hover:text-primary/80 transition-colors bg-primary/5 p-1 px-2 rounded-md w-fit"
                  onClick={() => handleWhatsAppClick(member.phone, sub.memberName, sub.memberId)}
                >
                  <MessageSquare className="h-4 w-4" />
                  <p className="font-mono text-base font-medium" dir="ltr">{member.phone}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">-</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("subscriptions.plan")}</Label>
              <p className="font-medium text-base">{sub.planName}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("common.amount")}</Label>
              <p className="font-medium text-base text-green-600">{sub.amount.toFixed(2)} {t("common.currency")}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("common.status")}</Label>
              <div>
                <Badge variant={sub.paymentStatus === 'paid' ? 'default' : sub.paymentStatus === 'pending' ? 'outline' : 'destructive'}>
                  {t(`common.${sub.paymentStatus}`) || sub.paymentStatus}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("subscriptions.startDate")}</Label>
              <p className="font-medium">{formatDate(sub.startDate)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("subscriptions.endDate")}</Label>
              <p className="font-medium">{formatDate(sub.endDate)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("finance.paymentMethod")}</Label>
              <p className="font-medium">{sub.paymentMethod ? (t(`finance.paymentMethods.${sub.paymentMethod}`) || sub.paymentMethod) : "-"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("nav.transactionDate")}</Label>
              <p className="font-medium">{sub.createdAt ? new Date(sub.createdAt).toLocaleString(language === 'ar' ? 'ar-BH' : 'en-US') : formatDate(sub.startDate)}</p>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs text-muted-foreground">{t("common.id")}</Label>
              <p className="font-mono text-xs text-muted-foreground">{sub.id}</p>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTransaction.type === "sale") {
      const sale = selectedTransaction.data;
      const member = members?.find(m => m.id === sale.memberId);
      const buyerName = member ? `${member.firstName} ${member.lastName}` : (sale.buyerName || t("sales.defaultBuyer"));
      const buyerPhone = member?.phone || sale.buyerPhone;

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("sales.buyer")}</Label>
              {member ? (
                <p
                  className="font-medium text-base cursor-pointer hover:underline text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMemberClick(sale.memberId, "finance");
                  }}
                >
                  {buyerName}
                </p>
              ) : (
                <p className="font-medium text-base">{buyerName}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("members.phone")}</Label>
              {buyerPhone ? (
                <div
                  className="flex items-center gap-2 cursor-pointer text-primary hover:underline hover:text-primary/80 transition-colors bg-primary/5 p-1 px-2 rounded-md w-fit"
                  onClick={() => handleWhatsAppClick(buyerPhone, buyerName, sale.memberId)}
                >
                  <MessageSquare className="h-4 w-4" />
                  <p className="font-mono text-base font-medium" dir="ltr">{buyerPhone}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">-</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("sales.product")}</Label>
              <p className="font-medium text-base">{sale.productName}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("sales.quantity")}</Label>
              <p className="font-medium text-base">{sale.quantity}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("sales.total")}</Label>
              <p className="font-medium text-base text-green-600">{sale.totalPrice.toFixed(2)} {t("common.currency")}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("common.status")}</Label>
              <div>
                <Badge variant={sale.paymentStatus === 'paid' ? 'default' : sale.paymentStatus === 'pending' ? 'outline' : 'destructive'}>
                  {t(`common.${sale.paymentStatus}`) || sale.paymentStatus}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("nav.transactionDate")}</Label>
              <p className="font-medium">{new Date(sale.date).toLocaleString(language === 'ar' ? 'ar-BH' : 'en-US')}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("finance.paymentMethod")}</Label>
              <p className="font-medium">{sale.paymentMethod ? (t(`finance.paymentMethods.${sale.paymentMethod}`) || sale.paymentMethod) : "-"}</p>
            </div>
            {sale.receiptId && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("sales.receiptTitle")}</Label>
                <p className="font-mono text-sm">{sale.receiptId}</p>
              </div>
            )}
            <div className="space-y-1 col-span-2">
              <Label className="text-xs text-muted-foreground">{t("common.id")}</Label>
              <p className="font-mono text-xs text-muted-foreground">{sale.id}</p>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTransaction.type === "expense") {
      const exp = selectedTransaction.data;
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("finance.category")}</Label>
              <p className="font-medium text-base">{getCategoryLabel(exp.category)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("common.amount")}</Label>
              <p className="font-medium text-base text-red-600">{exp.amount.toFixed(2)} {t("common.currency")}</p>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs text-muted-foreground">{t("common.description")}</Label>
              <p className="font-medium text-base">{exp.description || "-"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("common.date")}</Label>
              <p className="font-medium">{formatDate(exp.date)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("common.id")}</Label>
              <p className="font-mono text-xs text-muted-foreground">EXP-{exp.id}</p>
            </div>
          </div>
        </div>
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-BH' : 'en-US', {
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('finance.title')}</h1>
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

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard.monthlyIncome')}</p>
                    <p className="text-2xl font-bold" data-testid="text-subscription-income">
                      {totalSubscriptionIncome.toFixed(2)} {t("common.currency")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('finance.subscriptionIncome')} - {t("common.details")}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-start py-2 px-2">{t('common.date')}</th>
                    <th className="text-start py-2 px-2">{t('nav.transactionDate')}</th>
                    <th className="text-start py-2 px-2">{t('subscriptions.member')}</th>
                    <th className="text-start py-2 px-2">{t('subscriptions.package')}</th>
                    <th className="text-start py-2 px-2">{t('common.amount')}</th>
                    <th className="text-start py-2 px-2">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map(sub => {
                    const sale = sales?.find(s => s.subscriptionId === sub.id);
                    const transactionDate = sale ? sale.date.split("T")[0] : sub.startDate;
                    return (
                      <tr
                        key={sub.id}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedTransactionId(`sub-${sub.id}`)}
                      >
                        <td className="py-2 px-2">{sub.startDate}</td>
                        <td className="py-2 px-2">{transactionDate}</td>
                        <td
                          className="py-2 px-2 font-medium cursor-pointer hover:underline text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMemberClick(sub.memberId, "subscriptions");
                          }}
                        >
                          {sub.memberName}
                        </td>
                        <td className="py-2 px-2">{sub.planName}</td>
                        <td className="py-2 px-2">{sub.amount.toFixed(2)}</td>
                        <td className="py-2 px-2">
                          <Badge variant={sub.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                            {sub.paymentStatus === 'paid' ? t('common.paid') : t('common.unpaid')}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dashboard.salesIncome')}</p>
                    <p className="text-2xl font-bold" data-testid="text-sales-income">
                      {totalSalesIncome.toFixed(2)} {t("common.currency")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('finance.salesIncome')} - {t("common.details")}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-start py-2 px-2">{t('common.date')}</th>
                    <th className="text-start py-2 px-2">{t('nav.transactionDate')}</th>
                    <th className="text-start py-2 px-2">{t('subscriptions.member')} / {t('sales.buyer')}</th>
                    <th className="text-start py-2 px-2">{t('sales.product')}</th>
                    <th className="text-start py-2 px-2">{t('common.amount')}</th>
                    <th className="text-start py-2 px-2">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(sale => {
                    const member = members?.find(m => m.id === sale.memberId);
                    const buyerDisplay = member ? `${member.firstName} ${member.lastName}` : (sale.buyerName || t("sales.defaultBuyer"));

                    return (
                      <tr
                        key={sale.id}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedTransactionId(`sale-${sale.id}`)}
                      >
                        <td className="py-2 px-2">{sale.date.split("T")[0]}</td>
                        <td className="py-2 px-2">{sale.date.split("T")[0]}</td>
                        <td className="py-2 px-2 font-medium">
                          {member ? (
                            <span
                              className="cursor-pointer hover:underline text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMemberClick(sale.memberId, "finance");
                              }}
                            >
                              {buyerDisplay}
                            </span>
                          ) : (
                            buyerDisplay
                          )}
                        </td>
                        <td className="py-2 px-2 font-medium">{sale.productName}</td>
                        <td className="py-2 px-2">{sale.totalPrice.toFixed(2)}</td>
                        <td className="py-2 px-2">
                          <Badge variant={sale.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                            {sale.paymentStatus === 'paid' ? t('common.paid') : t('common.unpaid')}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>


        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <Wallet className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("subscriptions.unpaid")}</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {totalPending.toFixed(2)} {t("common.currency")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('subscriptions.unpaid')} - {t("common.details")}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-start py-2 px-2">{t('common.date')}</th>
                    <th className="text-start py-2 px-2">{t('nav.transactionDate')}</th>
                    <th className="text-start py-2 px-2">{t('common.type')}</th>
                    <th className="text-start py-2 px-2">{t('members.name')} / {t('sales.buyer')}</th>
                    <th className="text-start py-2 px-2">{t('common.description')}</th>
                    <th className="text-start py-2 px-2">{t('common.amount')}</th>
                    <th className="text-start py-2 px-2">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidItems.length > 0 ? (
                    unpaidItems.map(item => (
                      <tr
                        key={item.id}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedTransactionId(item.id)}
                      >
                        <td className="py-2 px-2">{item.date}</td>
                        <td className="py-2 px-2">{item.transactionDate}</td>
                        <td className="py-2 px-2"><Badge variant="outline">{item.type}</Badge></td>
                        <td className="py-2 px-2 font-medium">{item.memberName}</td>
                        <td className="py-2 px-2">{item.description}</td>
                        <td className="py-2 px-2">{item.amount.toFixed(2)}</td>
                        <td className="py-2 px-2">
                          <Badge variant="secondary">
                            {item.status === 'pending' ? t('common.pending') : t('common.unpaid')}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        {t("common.noResults")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("finance.totalExpenses")}</p>
                <p className="text-2xl font-bold" data-testid="text-total-expenses">
                  {totalExpenses.toFixed(2)} {t("common.currency")}
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
                <p className="text-sm text-muted-foreground">{t("finance.netProfit")}</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-net-profit">
                  {netProfit.toFixed(2)} {t("common.currency")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {t("finance.summaryTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">{t("finance.totalIncome")}</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {totalIncome.toFixed(2)} {t("common.currency")}
              </p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t("finance.subscriptionIncome")}: </span>
                  <span>{totalSubscriptionIncome.toFixed(2)} {t("common.currency")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("finance.salesIncome")}: </span>
                  <span>{totalSalesIncome.toFixed(2)} {t("common.currency")}</span>
                </div>
                {totalPending > 0 && (
                  <div className="flex justify-between text-yellow-600 pt-1 border-t">
                    <span>{t("subscriptions.unpaid")}: </span>
                    <span>{totalPending.toFixed(2)} {t("common.currency")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">{t("finance.totalExpenses")}</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {totalExpenses.toFixed(2)} {t("common.currency")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {filteredExpenses?.length ?? 0} {t("finance.records")}
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">{t("finance.netProfit")}</p>
              <p className={`text-3xl font-bold ${netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {netProfit.toFixed(2)} {t("common.currency")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}% {t("finance.profitMargin")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            {t("finance.details") || "Transaction Ledger"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search")}
                  className="pl-9"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={ledgerFilter} onValueChange={setLedgerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("finance.filterByType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("finance.allTransactions") || t("common.all")}</SelectItem>
                <SelectItem value="income">{t("finance.incomeOnly") || "Income Only"}</SelectItem>
                <SelectItem value="expense">{t("finance.expensesOnly") || "Expenses Only"}</SelectItem>
                <SelectItem value="unpaid">{t("finance.unpaidOnly") || "Unpaid / Pending"}</SelectItem>
                <SelectItem value="subscriptions">{t("nav.subscriptions")}</SelectItem>
                <SelectItem value="sales">{t("nav.sales")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="h-12 px-4 text-start font-medium text-muted-foreground">{t("common.date")}</th>
                  <th className="h-12 px-4 text-start font-medium text-muted-foreground">{t("common.type")}</th>
                  <th className="h-12 px-4 text-start font-medium text-muted-foreground">{t("members.name")} / {t("sales.buyer")}</th>
                  <th className="h-12 px-4 text-start font-medium text-muted-foreground">{t("common.description")}</th>
                  <th className="h-12 px-4 text-start font-medium text-muted-foreground">{t("common.amount")}</th>
                  <th className="h-12 px-4 text-start font-medium text-muted-foreground">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLedger.length > 0 ? (
                  paginatedLedger.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTransactionId(tx.id)}
                    >
                      <td className="p-4">{formatDate(tx.date)}</td>
                      <td className="p-4">
                        <Badge variant="outline">{tx.type}</Badge>
                      </td>
                      <td className="p-4 font-medium">{tx.memberName || "-"}</td>
                      <td className="p-4 font-medium">{tx.description}</td>
                      <td className={`p-4 font-bold ${tx.isExpense ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                        {tx.isExpense ? "-" : "+"}{tx.amount.toFixed(2)} {t("common.currency")}
                      </td>
                      <td className="p-4">
                        <Badge variant={tx.status === 'paid' ? 'default' : tx.status === 'pending' ? 'outline' : 'destructive'}>
                          {t(`common.${tx.status}`) || tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {t("common.noResults")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {t("common.page")} {ledgerPage} {t("common.of")} {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLedgerPage(p => Math.max(1, p - 1))}
                  disabled={ledgerPage === 1}
                >
                  {t("common.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLedgerPage(p => Math.min(totalPages, p + 1))}
                  disabled={ledgerPage === totalPages}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTransactionId} onOpenChange={(open) => !open && setSelectedTransactionId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("finance.details")}</DialogTitle>
          </DialogHeader>
          {renderTransactionDetails()}
        </DialogContent>
      </Dialog>
      <WhatsAppTemplateDialog
        member={whatsAppMember}
        open={isWhatsAppDialogOpen}
        onOpenChange={(open) => {
          setIsWhatsAppDialogOpen(open);
          if (!open) {
            setWhatsAppMember(null);
          }
        }}
        templates={whatsappTemplates}
      />
      <MemberDetailsDialog
        member={detailsMember}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        initialTab={detailsTab}
      />
    </div>
  );
}
