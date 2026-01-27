import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingBag, TrendingUp, Package, Printer, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Sale } from "@shared/schema";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";

export default function Sales() {
  const { role, clubSettings } = useAuth();
  const { t, language } = useLanguage();
  const isAdmin = role === "admin";
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [receiptData, setReceiptData] = useState<Sale | null>(null);

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ title: t("common.success"), description: t("sales.deleteSuccess") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("common.error"), description: t("sales.deleteError") });
    }
  });

  const cancelSale = useMutation({
    mutationFn: async ({ saleId, reason }: { saleId: string; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/sales/${saleId}/cancel`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsCancelDialogOpen(false);
      setSelectedSale(null);
      setCancelReason("");
      toast({
        title: t("common.success"),
        description: t("sales.cancelSuccess"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("sales.cancelError"),
        variant: "destructive",
      });
    },
  });

  const openCancelDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setCancelReason("");
    setIsCancelDialogOpen(true);
  };

  const handleCancelDialogChange = (open: boolean) => {
    setIsCancelDialogOpen(open);
    if (!open) {
      setSelectedSale(null);
      setCancelReason("");
    }
  };

  const filteredSales = sales?.filter((sale) => {
    const matchesSearch =
      sale.productName.includes(searchQuery) ||
      sale.buyerName?.includes(searchQuery) ||
      false;
    const matchesDate = !selectedDate || sale.date === selectedDate;
    return matchesSearch && matchesDate;
  });

  const activeSales = filteredSales?.filter((sale) => sale.status !== "cancelled") ?? [];
  const totalSales = activeSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const totalItems = activeSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const uniqueProducts = new Set(activeSales.map((sale) => sale.productId)).size;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-BH' : 'en-US', {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getPaymentMethodLabel = (method?: string | null) => {
    if (!method) return "-";
    const key = `finance.paymentMethods.${method}`;
    const label = t(key);
    return label === key ? method : label;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('sales.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('sales.subtitle')}</p>
        </div>
      </div>

      <Dialog open={isCancelDialogOpen} onOpenChange={handleCancelDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('sales.cancelSale')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{t("sales.product")}: {selectedSale?.productName ?? "-"}</p>
              <p>{t("sales.total")}: {selectedSale ? selectedSale.totalPrice.toFixed(2) : "-"} {t("common.currency")}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('sales.reason')}</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t("sales.cancelReasonPlaceholder")}
                rows={3}
                data-testid="input-cancel-reason"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleCancelDialogChange(false)}
              >
                {t("common.back")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const reason = cancelReason.trim();
                  if (!selectedSale) return;
                  if (!reason) {
                    toast({
                      title: t("common.error"),
                      description: t("sales.cancelReasonRequired"),
                      variant: "destructive",
                    });
                    return;
                  }
                  cancelSale.mutate({ saleId: selectedSale.id, reason });
                }}
                disabled={cancelSale.isPending || !selectedSale}
                data-testid="button-confirm-cancel"
              >
                {cancelSale.isPending ? t("sales.cancelInProgress") : t("sales.cancelConfirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("sales.totalSalesLabel")}</p>
                <p className="text-2xl font-bold" data-testid="text-total-sales">
                  {totalSales.toFixed(2)} {t("common.currency")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("sales.totalItemsLabel")}</p>
                <p className="text-2xl font-bold" data-testid="text-total-items">
                  {totalItems} {t("sales.itemsUnit")}
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
                <p className="text-sm text-muted-foreground">{t("sales.uniqueProductsLabel")}</p>
                <p className="text-2xl font-bold" data-testid="text-unique-products">
                  {uniqueProducts} {t("sales.productsUnit")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base">{t("sales.tableTitle")}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search")}
                  className="pr-10 w-full sm:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-sales"
                />
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-40"
                data-testid="input-filter-date"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t("sales.product")}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t("sales.buyer")}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t("sales.quantity")}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t("sales.unitPrice")}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t("sales.total")}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t("common.date")}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t("finance.paymentMethod")}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t("common.status")}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales && filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-b last:border-0 hover-elevate" data-testid={`row-sale-${sale.id}`}>
                      <td className="py-3 px-3 font-medium text-right">{sale.productName}</td>
                      <td className="py-3 px-3 text-muted-foreground text-right">{sale.buyerName || "-"}</td>
                      <td className="py-3 px-3 text-right">
                        <Badge variant="secondary">{sale.quantity}</Badge>
                      </td>
                      <td className="py-3 px-3 text-right">{sale.unitPrice.toFixed(2)} {t("common.currency")}</td>
                      <td className="py-3 px-3 font-medium text-right">{sale.totalPrice.toFixed(2)} {t("common.currency")}</td>
                      <td className="py-3 px-3 text-muted-foreground text-right">{formatDate(sale.date)}</td>
                      <td className="py-3 px-3 text-right">
                        <Badge variant="secondary">
                          {getPaymentMethodLabel(sale.paymentMethod)}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {sale.status === "cancelled" ? (
                          <div className="space-y-1">
                            <Badge variant="destructive">{t("sales.statusCancelled")}</Badge>
                            <p className="text-xs text-muted-foreground">
                              {sale.cancelledReason || "-"}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="secondary">{t("sales.statusCompleted")}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 flex gap-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReceiptData(sale)}
                          title={t("sales.printReceipt")}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCancelDialog(sale)}
                          disabled={sale.status === "cancelled"}
                          data-testid={`button-cancel-sale-${sale.id}`}
                        >
                          {t("common.cancel")}
                        </Button>
                        {isAdmin && <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(t('sales.deleteConfirm'))) deleteSaleMutation.mutate(sale.id);
                          }}
                          title={t("sales.deleteRecord")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      {searchQuery || selectedDate ? t("common.noResults") : t("sales.noSales")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptData} onOpenChange={(open) => !open && setReceiptData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t("sales.receiptTitle")}</DialogTitle></DialogHeader>
          {receiptData && (
            <div className="space-y-6" id="sale-receipt-area">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{clubSettings?.name || "Kumite Combat"}</h2>
                <p className="text-muted-foreground text-sm">{t("sales.receiptSubtitle")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("common.date")}: {new Date(receiptData.date).toLocaleDateString(language === 'ar' ? 'ar-BH' : 'en-US')}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{t("sales.product")}:</span> <span className="font-medium">{receiptData.productName}</span></div>
                <div className="flex justify-between"><span>{t("sales.buyer")}:</span> <span>{receiptData.buyerName || '-'}</span></div>
                <div className="flex justify-between"><span>{t("sales.quantity")}:</span> <span>{receiptData.quantity}</span></div>
                <div className="flex justify-between border-t pt-2 mt-2"><span>{t("sales.total")}:</span> <span className="font-bold text-lg">{receiptData.totalPrice.toFixed(2)} {t("common.currency")}</span></div>
                <div className="flex justify-between"><span>${t("finance.paymentMethod")}:</span> <span>{getPaymentMethodLabel(receiptData.paymentMethod)}</span></div>
              </div>
              <Button className="w-full" onClick={() => {
                const content = document.getElementById('sale-receipt-area')?.innerHTML;
                const printWindow = window.open('', '', 'height=600,width=800');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>${t("sales.receiptTitle")} - ${receiptData.productName}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                          body { font-family: 'Cairo', sans-serif; }
                          @page { size: 80mm 150mm; margin: 0; }
                        </style>
                      </head>
                      <body class="bg-white p-4" dir="${language === 'ar' ? 'rtl' : 'ltr'}">
                        <div class="max-w-[80mm] mx-auto">
                          <!-- Header -->
                          <div class="flex flex-col items-center mb-6 text-center">
                            ${clubSettings?.logoUrlLight ? `<img src="${clubSettings.logoUrlLight}" class="w-20 h-20 object-contain mb-2" alt="Logo" />` : ''}
                            <h1 class="text-xl font-bold text-gray-900">${clubSettings?.name || t("members.clubFallback")}</h1>
                             <p class="text-xs text-gray-500 mt-1">${new Date(receiptData.date).toLocaleDateString('ar-BH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>

                          <!-- Receipt Details -->
                          <div class="border-t-2 border-dashed border-gray-200 py-4 space-y-3">
                             <div class="flex justify-between items-center text-sm">
                              <span class="text-gray-500">${t("sales.invoiceNumber")}:</span>
                              <span class="font-mono font-bold">#${receiptData.id.slice(0, 8)}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                              <span class="text-gray-500">${t("sales.buyer")}:</span>
                              <span class="font-semibold text-gray-900">${receiptData.buyerName || t("sales.defaultBuyer")}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                              <span class="text-gray-500">${t("sales.product")}:</span>
                              <span class="font-semibold text-gray-900">${receiptData.productName}</span>
                            </div>
                             <div class="flex justify-between items-center text-sm">
                              <span class="text-gray-500">${t("sales.quantity")}:</span>
                              <span class="font-mono text-gray-900">${receiptData.quantity}</span>
                            </div>
                             <div class="flex justify-between items-center text-sm">
                              <span class="text-gray-500">${t("sales.unitPrice")}:</span>
                              <span class="font-mono text-gray-900">${receiptData.unitPrice.toFixed(2)} ${t("common.currency")}</span>
                            </div>
                          </div>

                          <!-- Totals -->
                          <div class="border-t-2 border-dashed border-gray-200 pt-4 mt-2">
                            <div class="flex justify-between items-center mb-4">
                              <span class="text-base font-bold text-gray-900">${t("sales.total")}</span>
                              <span class="text-xl font-bold text-gray-900">${receiptData.totalPrice.toFixed(2)} ${t("common.currency")}</span>
                            </div>
                             <div class="flex justify-between items-center text-xs text-gray-500 bg-gray-50 p-2 rounded">
                              <span>${t("finance.paymentMethod")}:</span>
                              <span class="font-medium text-gray-900">
                                ${getPaymentMethodLabel(receiptData.paymentMethod)}
                              </span>
                            </div>
                          </div>

                          <!-- Footer -->
                          <div class="mt-8 text-center space-y-1">
                             <p class="text-xs text-gray-400">${t("sales.receiptThanks")}</p>
                             <p class="text-[10px] text-gray-300">${t("sales.receiptFooterNote")}</p>
                          </div>
                        </div>
                        <script>
                          window.onload = () => { setTimeout(() => window.print(), 500); };
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }}>
                <Printer className="w-4 h-4 ml-2" /> {t("common.print")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
