import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { Coins, Loader2 } from "lucide-react";

type BillingConfig = {
  enabled: boolean;
  feeFlat: number;
  feePercent: number;
  currency: string;
};

type FeeStats = {
  capturedCount: number;
  totalFees: number;
  totalVolume: number;
  recent: Array<{
    id: string;
    tenantName: string;
    packageName: string;
    packageAmount: number;
    platformFee: number;
    amount: number;
    currency: string;
    paidAt?: string;
  }>;
};

export function PlatformTransactionBillingPanel() {
  const { t: tr } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ config: BillingConfig; stats: FeeStats }>({
    queryKey: ["/api/platform/transaction-billing"],
    queryFn: () => apiJson("/api/platform/transaction-billing"),
  });

  const [config, setConfig] = useState<BillingConfig | null>(null);

  useEffect(() => {
    if (data?.config) setConfig(data.config);
  }, [data?.config]);

  const save = useMutation({
    mutationFn: () =>
      apiJson("/api/platform/transaction-billing", {
        method: "PATCH",
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/platform/transaction-billing"] });
      toast({ title: tr("common.success"), description: tr("platformAdmin.billing.configSaved") });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: tr("common.error"), description: e.message }),
  });

  if (isLoading || !config) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{stats?.capturedCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">{tr("platformAdmin.billing.statTransactions")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{stats?.totalFees?.toFixed(3) ?? "0"} {config.currency}</p>
            <p className="text-xs text-muted-foreground">{tr("platformAdmin.billing.statFees")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{stats?.totalVolume?.toFixed(3) ?? "0"} {config.currency}</p>
            <p className="text-xs text-muted-foreground">{tr("platformAdmin.billing.statVolume")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            {tr("platformAdmin.billing.configTitle")}
          </CardTitle>
          <CardDescription>{tr("platformAdmin.billing.configDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{tr("platformAdmin.billing.enabled")}</p>
              <p className="text-sm text-muted-foreground">{tr("platformAdmin.billing.enabledHint")}</p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{tr("platformAdmin.billing.feeFlat")}</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={config.feeFlat}
                onChange={(e) => setConfig({ ...config, feeFlat: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{tr("platformAdmin.billing.feePercent")}</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={config.feePercent}
                onChange={(e) => setConfig({ ...config, feePercent: Number(e.target.value) })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{tr("platformAdmin.billing.feeFormula")}</p>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? tr("common.saving") : tr("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("platformAdmin.billing.recentTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("platformAdmin.billing.colClub")}</TableHead>
                <TableHead>{tr("platformAdmin.billing.colPackage")}</TableHead>
                <TableHead>{tr("platformAdmin.billing.colFee")}</TableHead>
                <TableHead>{tr("common.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stats?.recent ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.tenantName}</TableCell>
                  <TableCell>
                    <p className="font-medium">{row.packageName}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(row.packageAmount).toFixed(3)} + {Number(row.platformFee).toFixed(3)} = {Number(row.amount).toFixed(3)} {row.currency}
                    </p>
                  </TableCell>
                  <TableCell className="font-medium">{Number(row.platformFee).toFixed(3)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.paidAt ? new Date(row.paidAt).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {!stats?.recent?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {tr("platformAdmin.billing.noTransactions")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
