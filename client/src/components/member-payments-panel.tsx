import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import type { MemberPayment } from "@shared/schema";

export function MemberPaymentsPanel() {
  const { t } = useLanguage();

  const { data: payments = [], isLoading } = useQuery<MemberPayment[]>({
    queryKey: ["/api/member-payments"],
    queryFn: () => apiJson("/api/member-payments"),
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
          <div key={payment.id} className="flex items-center justify-between gap-3 text-sm border-b pb-2 last:border-0">
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
            <div className="text-end">
              <p className="font-semibold">{payment.amount} {payment.currency}</p>
              <Badge variant={payment.status === "captured" ? "default" : "secondary"} className="text-[10px]">
                {t(`payments.status.${payment.status}`)}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
