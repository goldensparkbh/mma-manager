import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Loader2, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";

type CommissionRules = {
  commissionType: "percent" | "flat";
  rate: number;
  applyTo: string;
};

type CommissionEntry = {
  id: string;
  coachName: string;
  amount: number;
  description?: string;
  periodMonth: string;
};

export function CommissionsPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const month = new Date().toISOString().slice(0, 7) + "-01";

  const { data: rules, isLoading } = useQuery<CommissionRules>({
    queryKey: ["/api/commissions/rules"],
    queryFn: () => apiJson("/api/commissions/rules"),
  });

  const [commissionType, setCommissionType] = useState<"percent" | "flat">("percent");
  const [rate, setRate] = useState("10");

  const { data: report = [] } = useQuery<CommissionEntry[]>({
    queryKey: ["/api/commissions/report", month],
    queryFn: () =>
      apiJson(
        `/api/commissions/report?from=${encodeURIComponent(month)}&to=${encodeURIComponent(month)}`,
      ),
    enabled: !!rules,
  });

  const saveRules = useMutation({
    mutationFn: () =>
      apiJson("/api/commissions/rules", {
        method: "PATCH",
        body: JSON.stringify({ commissionType, rate: Number(rate) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/rules"] });
      toast({ title: t("common.success") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const calculate = useMutation({
    mutationFn: () =>
      apiJson("/api/commissions/calculate", {
        method: "POST",
        body: JSON.stringify({ month }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/report"] });
      toast({ title: t("commissions.calculated") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4" />
          {t("commissions.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("commissions.type")}</Label>
            <Select
              value={commissionType}
              onValueChange={(v) => setCommissionType(v as "percent" | "flat")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">{t("commissions.percent")}</SelectItem>
                <SelectItem value="flat">{t("commissions.flat")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("commissions.rate")}</Label>
            <Input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder={String(rules?.rate ?? 10)}
            />
          </div>
          <div className="flex items-end">
            <Button disabled={saveRules.isPending} onClick={() => saveRules.mutate()}>
              {t("common.save")}
            </Button>
          </div>
        </div>

        <Button variant="outline" disabled={calculate.isPending} onClick={() => calculate.mutate()}>
          <Calculator className="h-4 w-4 me-2" />
          {t("commissions.calculate")}
        </Button>

        {report.length > 0 && (
          <div className="space-y-2 text-sm">
            {report.map((e) => (
              <div key={e.id} className="flex justify-between border-b pb-2">
                <span>{e.coachName}</span>
                <span className="font-medium">{e.amount}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
