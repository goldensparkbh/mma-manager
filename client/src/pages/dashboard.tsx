import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CreditCard, TrendingUp, Wallet, Phone, ShoppingCart, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { arBH } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar"; // Assuming you have a Calendar component or use native date inputs
import type { DashboardStats } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");

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
  const { clubSettings } = useAuth(); // Ensure this is imported

  const handleWhatsApp = (member: any) => {
    let message = `مرحباً ${member.name}، نود تذكيرك بأن اشتراكك في النادي سينتهي بتاريخ ${member.subscriptionEnd}. يرجى التجديد للاستمرار في التدريب.`;

    if (clubSettings?.whatsappTemplate) {
      message = clubSettings.whatsappTemplate
        .replace(/{name}/g, member.name)
        .replace(/{firstName}/g, member.firstName || "")
        .replace(/{lastName}/g, member.lastName || "")
        .replace(/{memberId}/g, member.memberId)
        .replace(/{phone}/g, member.phone)
        .replace(/{startDate}/g, member.subscriptionStart || "")
        .replace(/{endDate}/g, member.subscriptionEnd || "")
        .replace(/{balance}/g, member.balance ? member.balance.toString() : "0")
        .replace(/{status}/g, member.status === "active" ? "نشط" : "منتهي");
    }

    const phone = member.phone || "";
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredExpiring = stats?.expiringSubscriptions?.filter(
    (member) =>
      member.name.includes(searchQuery) || member.memberId.includes(searchQuery)
  );

  const formatDate = () => {
    const now = new Date();
    return new Intl.DateTimeFormat("ar-BH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(now);
  };

  const getStatusBadge = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          منتهي
        </Badge>
      );
    } else if (diffDays <= 7) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs">
          ينتهي خلال {diffDays} أيام
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">{formatDate()}</p>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">لوحة التحكم</h1>
            <p className="text-sm text-muted-foreground">{formatDate()}</p>
          </div>

          <div className="flex flex-wrap gap-2 items-end bg-card p-3 rounded-lg border shadow-sm">
            <div className="space-y-1">
              <Label className="text-xs">من</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                className="h-9 w-36"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="h-9 w-36"
              />
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={setThisMonth} className="h-9">هذا الشهر</Button>
              <Button variant="outline" size="sm" onClick={setLastMonth} className="h-9">الشهر السابق</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عدد الأعضاء</p>
                <p className="text-2xl font-bold" data-testid="text-total-members">
                  {stats?.totalMembers ?? 0}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  +{stats?.newMembersThisMonth ?? 0} هذا الشهر
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">اشتراكات نشطة</p>
                <p className="text-2xl font-bold" data-testid="text-active-subs">
                  {stats?.activeSubscriptions ?? 0}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {stats?.totalMembers ? Math.round((stats.activeSubscriptions / stats.totalMembers) * 100) : 0}٪ من الأعضاء
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">دخل الاشتراكات</p>
                <p className="text-2xl font-bold" data-testid="text-monthly-income">
                  {stats?.monthlyIncome?.toLocaleString() ?? 0} د.ب
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">هذا الشهر</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                <ShoppingCart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">دخل المبيعات</p>
                <p className="text-2xl font-bold" data-testid="text-sales-income">
                  {stats?.salesIncome?.toLocaleString() ?? 0} د.ب
                </p>
                <p className="text-xs text-muted-foreground">في الفترة المحددة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">دخل الاشتراكات</p>
                <p className="text-2xl font-bold" data-testid="text-monthly-income">
                  {stats?.monthlyIncome?.toLocaleString() ?? 0} د.ب
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">في الفترة المحددة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صافي الربح</p>
                <p className="text-2xl font-bold" data-testid="text-net-profit">
                  {stats?.netProfit?.toLocaleString() ?? 0} د.ب
                </p>
                <p className="text-xs text-muted-foreground">تقديري</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-base">الأعضاء الذين تنتهي اشتراكاتهم قريباً</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Expiring subscriptions</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="بحث بالاسم أو رقم العضوية..."
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
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">العضو</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">رقم العضوية</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">تاريخ الانتهاء</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">الحالة</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">التواصل</th>
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
                                title="إرسال تذكير واتساب"
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
                          لا توجد اشتراكات تنتهي قريباً
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
              <CardTitle className="text-base">اشتراكات الشهر</CardTitle>
              <p className="text-xs text-muted-foreground">Monthly subscriptions</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm">عدد الاشتراكات الجديدة</p>
                  <p className="text-xs text-muted-foreground">New memberships</p>
                </div>
                <Badge variant="secondary">{stats?.newMembersThisMonth ?? 0} لاعب</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm">إجمالي مبالغ الاشتراك</p>
                  <p className="text-xs text-muted-foreground">Total fees</p>
                </div>
                <Badge variant="secondary">{stats?.monthlyIncome?.toLocaleString() ?? 0} د.ب</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm">متوسط اشتراك اللاعب</p>
                  <p className="text-xs text-muted-foreground">Average per member</p>
                </div>
                <Badge variant="secondary">
                  {stats?.activeSubscriptions && stats.monthlyIncome
                    ? Math.round(stats.monthlyIncome / stats.activeSubscriptions)
                    : 0}{" "}
                  د.ب
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ملخص التكاليف</CardTitle>
              <p className="text-xs text-muted-foreground">Monthly costs</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.expensesByCategory && stats.expensesByCategory.length > 0 ? (
                stats.expensesByCategory.map((exp) => (
                  <div key={exp.category} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">
                      {exp.category === 'rent' ? 'إيجار' :
                        exp.category === 'salaries' ? 'رواتب' :
                          exp.category === 'utilities' ? 'فواتير' :
                            exp.category === 'maintenance' ? 'صيانة' :
                              exp.category === 'marketing' ? 'تسويق' :
                                exp.category === 'other' ? 'أخرى' : exp.category}
                    </span>
                    <Badge variant="secondary">{exp.total.toLocaleString()} د.ب</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4 text-sm">
                  لا توجد مصروفات مسجلة
                </div>
              )}

              <div className="flex items-center justify-between py-2 mt-4 pt-4 border-t">
                <span className="text-sm font-medium">صافي الربح التقديري</span>
                <Badge variant={stats?.netProfit && stats.netProfit >= 0 ? "default" : "destructive"}>
                  {stats?.netProfit?.toLocaleString() ?? 0} د.ب
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
