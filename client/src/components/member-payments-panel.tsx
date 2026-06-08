import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Receipt, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { apiJson } from "@/lib/api";
import type { MemberPayment } from "@shared/schema";

export function MemberPaymentsPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canRefund = hasPermission(PERMISSIONS.FINANCE_EDIT);

  const { data: payments = [], isLoading } = useQuery<MemberPayment[]>({
    queryKey: ["/api/member-payments"],
    queryFn: () => apiJson("/api/member-payments"),
  });

  const refund = useMutation({
    mutationFn: (id: string) =>
      apiJson(`/api/member-payments/${id}/refund`, {
        method: "POST",
        body: JSON.stringify({ reason: "staff_refund" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member-payments"] });
      toast({ title: t("payments.refunded") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;
  }

  if (payments.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t("payments.noPayments")}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          {t("payments.recentTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.slice(0, 30).map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between gap-3 text-sm border-b pb-2 last:border-0"
          >
            <div>
              <p className="font-medium">{payment.packageName || t("payments.membership")}</p>
              <p className="text-muted-foreground text-xs">
                {payment.paidAt
                  ? format(new Date(payment.paidAt), "PPp")
                  : payment.createdAt
                    ? format(new Date(payment.createdAt), "PPp")
                    : "—"}
              </p>
            </div>
            <div className="text-end flex flex-col items-end gap-1">
              <p className="font-semibold">
                {payment.amount} {payment.currency}
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant={payment.status === "captured" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {t(`payments.status.${payment.status}`)}
                </Badge>
                {canRefund && payment.status === "captured" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    disabled={refund.isPending}
                    onClick={() => refund.mutate(payment.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 me-1" />
                    {t("payments.refund")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
