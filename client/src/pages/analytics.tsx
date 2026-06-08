import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiJson } from "@/lib/api";
import { useLanguage } from "@/context/language-context";

type Branch = { id: string; name: string };

type AnalyticsData = {
  summary: { avgFillRate: number; totalSessions: number };
  classUtilization: { name: string; day: string; capacity: number; booked: number; fill_rate: number }[];
  coachRevenue: { coach_name: string; sessions: number; revenue: number }[];
  churn: { expired_last_30: number; active_now: number };
  packageBreakdown: { plan_name: string; count: number; revenue: number }[];
};

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [from] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString());
  const [to] = useState(() => new Date().toISOString());
  const [branchId, setBranchId] = useState<string>("all");

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: () => apiJson("/api/branches"),
  });

  const { data, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", from, to, branchId],
    queryFn: () => {
      const branchQ =
        branchId !== "all" ? `&branchId=${encodeURIComponent(branchId)}` : "";
      return apiJson(
        `/api/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${branchQ}`,
      );
    },
  });

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Class", "Day", "Capacity", "Booked", "Fill %"],
      ...data.classUtilization.map((r) => [r.name, r.day, r.capacity, r.booked, r.fill_rate]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "analytics.csv";
    a.click();
  };

  const topCoaches = useMemo(() => data?.coachRevenue?.slice(0, 8) || [], [data]);

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t("analytics.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {branches.length > 1 && (
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("branches.title")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={() => { refetch(); exportCsv(); }}>
            {t("analytics.export")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t("analytics.avgFill")}</p><p className="text-2xl font-bold">{data?.summary.avgFillRate ?? 0}%</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t("analytics.sessions")}</p><p className="text-2xl font-bold">{data?.summary.totalSessions ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t("analytics.churn")}</p><p className="text-2xl font-bold">{data?.churn.expired_last_30 ?? 0}</p></CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">{t("analytics.byCoach")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {topCoaches.length === 0 ? <p className="text-muted-foreground">{t("common.noData")}</p> : topCoaches.map((c) => (
                  <div key={c.coach_name} className="flex justify-between border-b pb-2">
                    <span>{c.coach_name}</span>
                    <span>{c.sessions} {t("analytics.sessionsShort")}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t("analytics.byPackage")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(data?.packageBreakdown || []).map((p) => (
                  <div key={p.plan_name} className="flex justify-between border-b pb-2">
                    <span>{p.plan_name}</span>
                    <span>{p.count} · {p.revenue}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
