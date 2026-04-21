import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CreditCard, TrendingUp, Wallet, Phone, ShoppingCart, Calendar as CalendarIcon, Filter, FileText, User, CreditCard as CardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "wouter";
import { format } from "date-fns";
import { arBH, enUS } from "date-fns/locale";
import type { DashboardStats, Sale, Subscription } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { applyWhatsAppTemplate } from "@/lib/whatsapp";
import { TransactionDetailsDialog } from "@/components/transaction-details-dialog";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t, language } = useLanguage();
  const [selectedTransaction, setSelectedTransaction] = useState<(Sale | Subscription & { type: 'sale' | 'subscription' }) | null>(null);
  const [isTransactionDocsOpen, setIsTransactionDocsOpen] = useState(false);

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0],
  });

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", dateRange.start, dateRange.end],
  });

  const setLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
  };

  // Get settings from AuthContext
  const { clubSettings } = useAuth();

  const handleWhatsApp = (member: any) => {
    const templateBody =
      clubSettings?.whatsappTemplates?.[0]?.body ||
      clubSettings?.whatsappTemplate ||
      t("dashboard.whatsappFallback");
    const message = applyWhatsAppTemplate(templateBody, member, t);

    const phone = member.phone || "";
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredExpiring = stats?.expiringSubscriptions?.filter(
    (member) =>
      member.name.includes(searchQuery) || member.memberId.includes(searchQuery)
  );

  const formatDate = () => {
    const now = new Date();
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-BH' : 'en-US', {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(now);
  };

  const getExpenseCategoryLabel = (category: string) => {
    const key = `finance.categories.${category}`;
    const label = t(key);
    return label === key ? category : label;
  };

  const getStatusBadge = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          {t('common.expired')}
        </Badge>
      );
    } else if (diffDays <= 7) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs">
          {t("dashboard.expiresInDays")
            .replace("{days}", String(diffDays))
            .replace("{count}", String(diffDays))}
        </Badge>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{formatDate()}</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 items-end bg-card p-3 rounded-lg border shadow-sm">
            <div className="space-y-1">
              <Label className="text-xs">{t("common.from")}</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                className="h-9 w-36"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("common.to")}</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="h-9 w-36"
              />
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={setThisMonth} className="h-9">{t("common.thisMonth")}</Button>
              <Button variant="outline" size="sm" onClick={setLastMonth} className="h-9">{t("common.lastMonth")}</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Link href="/members">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.totalMembers')}</p>
                  <p className="text-2xl font-bold" data-testid="text-total-members">
                    {stats?.totalMembers ?? 0}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    +{stats?.newMembersThisMonth ?? 0} {t("dashboard.inPeriod")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/subscriptions">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.activeSubscriptions')}</p>
                  <p className="text-2xl font-bold" data-testid="text-active-subs">
                    {stats?.activeSubscriptions ?? 0}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {stats?.totalMembers ? Math.round((stats.activeSubscriptions / stats.totalMembers) * 100) : 0}% {t("dashboard.ofMembers")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/finance">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.monthlyIncome')}</p>
                  <p className="text-2xl font-bold" data-testid="text-monthly-income">
                    {stats?.monthlyIncome?.toLocaleString() ?? 0} {t("common.currency")}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">{t("dashboard.inPeriod")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/sales">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                  <ShoppingCart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.salesIncome')}</p>
                  <p className="text-2xl font-bold" data-testid="text-sales-income">
                    {stats?.salesIncome?.toLocaleString() ?? 0} {t("common.currency")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("dashboard.inPeriod")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/finance">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.netProfit')}</p>
                  <p className="text-2xl font-bold" data-testid="text-net-profit">
                    {stats?.netProfit?.toLocaleString() ?? 0} {t("common.currency")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("common.estimated")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="h-[500px]">
        <CalendarWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base">{t("dashboard.expiringTitle")}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.expiringSubtitle")}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder={t("dashboard.expiringSearchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                  data-testid="input-search-expiring"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-start py-3 px-2 font-medium text-muted-foreground">{t("members.name")}</th>
                      <th className="text-start py-3 px-2 font-medium text-muted-foreground">{t("members.memberId")}</th>
                      <th className="text-start py-3 px-2 font-medium text-muted-foreground">{t("subscriptions.endDate")}</th>
                      <th className="text-start py-3 px-2 font-medium text-muted-foreground">{t("members.status")}</th>
                      <th className="text-start py-3 px-2 font-medium text-muted-foreground">{t("common.contact")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpiring && filteredExpiring.length > 0 ? (
                      filteredExpiring.map((member) => (
                        <tr key={member.id} className="border-b last:border-0 hover-elevate">
                          <td className="py-3 px-2 font-medium" data-testid={`text-member-name-${member.id}`}>
                            {member.name}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">
                            #{member.memberId}
                          </td>
                          <td className="py-3 px-2">
                            {member.subscriptionEnd}
                          </td>
                          <td className="py-3 px-2">
                            {getStatusBadge(member.subscriptionEnd)}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleWhatsApp(member)}
                                title={t("dashboard.sendWhatsAppReminder")}
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                              <span className="text-xs ml-2 dir-ltr inline-block">{member.phone}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          {t("dashboard.noExpiring")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base">{t("sales.purchaseHistory")}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.salesIncome")}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-start py-3 px-2 font-medium text-muted-foreground">{t("common.date")}</th>
                      <th className="text-start py-3 px-2 font-medium text-muted-foreground">{t("members.name")}</th>
                      <th className="text-start py-3 px-2 font-medium text-muted-foreground">{t("common.description")}</th>
                      <th className="text-start py-3 px-2 font-medium text-muted-foreground">{t("common.amount")}</th>
                      <th className="text-start py-3 px-2 font-medium text-muted-foreground">{t("members.status")}</th>
                      <th className="text-end py-3 px-2 font-medium text-muted-foreground">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                      stats.recentTransactions.map((tx: any, idx: number) => (
                        <tr key={`${tx.type}-${tx.id}-${idx}`} className="border-b last:border-0 hover-elevate">
                          <td className="py-3 px-2">
                            {format(new Date(tx.type === 'sale' ? tx.date : tx.startDate), "yyyy/MM/dd")}
                          </td>
                          <td className="py-3 px-2 font-medium">
                            {tx.type === 'sale' ? (tx.buyerName || t('sales.defaultBuyer')) : tx.memberName}
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm">
                              {tx.type === 'sale' ? tx.productName : tx.planName}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-medium">
                            {(tx.type === 'sale' ? tx.totalPrice : tx.amount).toLocaleString()} {t("common.currency")}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={tx.type === 'sale' ? "outline" : "default"} className="text-[10px] px-1.5 h-5 capitalize">
                              {tx.type === 'sale' ? t('nav.store') : t('nav.subscriptions')}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => {
                                setSelectedTransaction(tx);
                                setIsTransactionDocsOpen(true);
                              }}
                            >
                              {t('common.preview')}
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          {t("common.noResults")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("dashboard.monthlySubscriptions")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("dashboard.monthlySubscriptionsSubtitle")}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm">{t("dashboard.newMemberships")}</p>
                  <p className="text-xs text-muted-foreground">{t("dashboard.newMembershipsHint")}</p>
                </div>
                <Badge variant="secondary">{stats?.newMembersThisMonth ?? 0} {t("dashboard.memberUnit")}</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm">{t("dashboard.totalFees")}</p>
                  <p className="text-xs text-muted-foreground">{t("dashboard.totalFeesHint")}</p>
                </div>
                <Badge variant="secondary">{stats?.monthlyIncome?.toLocaleString() ?? 0} {t("common.currency")}</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm">{t("dashboard.averagePerMember")}</p>
                  <p className="text-xs text-muted-foreground">{t("dashboard.averagePerMemberHint")}</p>
                </div>
                <Badge variant="secondary">
                  {stats?.activeSubscriptions && stats.monthlyIncome
                    ? Math.round(stats.monthlyIncome / stats.activeSubscriptions)
                    : 0}{" "}
                  {t("common.currency")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("dashboard.costSummary")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("dashboard.monthlyCosts")}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.expensesByCategory && stats.expensesByCategory.length > 0 ? (
                stats.expensesByCategory.map((exp) => (
                  <div key={exp.category} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">
                      {getExpenseCategoryLabel(exp.category)}
                    </span>
                    <Badge variant="secondary">{exp.total.toLocaleString()} {t("common.currency")}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4 text-sm">
                  {t("dashboard.noExpenses")}
                </div>
              )}

              <div className="flex items-center justify-between py-2 mt-4 pt-4 border-t">
                <span className="text-sm font-medium">{t("dashboard.estimatedNetProfit")}</span>
                <Badge variant={stats?.netProfit && stats.netProfit >= 0 ? "default" : "destructive"}>
                  {stats?.netProfit?.toLocaleString() ?? 0} {t("common.currency")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TransactionDetailsDialog
        transaction={selectedTransaction}
        isOpen={isTransactionDocsOpen}
        onClose={() => setIsTransactionDocsOpen(false)}
      />
    </div >
  );
}
