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

export default function Sales() {
  const { role, clubSettings } = useAuth();
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
      toast({ title: "تم الحذف", description: "تم حذف السجل بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل الحذف" });
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
        title: "تم الإلغاء",
        description: "تم إلغاء عملية البيع بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء عملية البيع",
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
    return new Intl.DateTimeFormat("ar-BH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">سجل المبيعات</h1>
          <p className="text-sm text-muted-foreground">عرض جميع عمليات البيع</p>
        </div>
      </div>

      <Dialog open={isCancelDialogOpen} onOpenChange={handleCancelDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إلغاء عملية البيع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>المنتج: {selectedSale?.productName ?? "-"}</p>
              <p>الإجمالي: {selectedSale ? selectedSale.totalPrice.toFixed(2) : "-"} د.ب</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">سبب الإلغاء</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="اكتب سبب الإلغاء..."
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
                رجوع
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const reason = cancelReason.trim();
                  if (!selectedSale) return;
                  if (!reason) {
                    toast({
                      title: "خطأ",
                      description: "يرجى إدخال سبب الإلغاء",
                      variant: "destructive",
                    });
                    return;
                  }
                  cancelSale.mutate({ saleId: selectedSale.id, reason });
                }}
                disabled={cancelSale.isPending || !selectedSale}
                data-testid="button-confirm-cancel"
              >
                {cancelSale.isPending ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
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
                <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
                <p className="text-2xl font-bold" data-testid="text-total-sales">
                  {totalSales.toFixed(2)} د.ب
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
                <p className="text-sm text-muted-foreground">عدد القطع المباعة</p>
                <p className="text-2xl font-bold" data-testid="text-total-items">
                  {totalItems} قطعة
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
                <p className="text-sm text-muted-foreground">المنتجات المباعة</p>
                <p className="text-2xl font-bold" data-testid="text-unique-products">
                  {uniqueProducts} منتج
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base">سجل المبيعات</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
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
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">المنتج</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">المشتري</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الكمية</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">سعر الوحدة</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الإجمالي</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">التاريخ</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الدفع</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الإجراء</th>
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
                      <td className="py-3 px-3 text-right">{sale.unitPrice.toFixed(2)} د.ب</td>
                      <td className="py-3 px-3 font-medium text-right">{sale.totalPrice.toFixed(2)} د.ب</td>
                      <td className="py-3 px-3 text-muted-foreground text-right">{formatDate(sale.date)}</td>
                      <td className="py-3 px-3 text-right">
                        <Badge variant="secondary">
                          {sale.paymentMethod === "cash"
                            ? "نقداً"
                            : sale.paymentMethod === "card"
                              ? "بطاقة"
                              : "تحويل"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {sale.status === "cancelled" ? (
                          <div className="space-y-1">
                            <Badge variant="destructive">ملغي</Badge>
                            <p className="text-xs text-muted-foreground">
                              {sale.cancelledReason || "-"}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="secondary">مكتمل</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 flex gap-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReceiptData(sale)}
                          title="طباعة إيصال"
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
                          إلغاء
                        </Button>
                        {isAdmin && <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('حذف السجل نهائياً؟')) deleteSaleMutation.mutate(sale.id);
                          }}
                          title="حذف السجل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      {searchQuery || selectedDate ? "لا توجد نتائج للبحث" : "لا توجد مبيعات حالياً"}
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
          <DialogHeader><DialogTitle>إيصال بيع</DialogTitle></DialogHeader>
          {receiptData && (
            <div className="space-y-6" id="sale-receipt-area">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{clubSettings?.name || "Kumite Combat"}</h2>
                <p className="text-muted-foreground text-sm">إيصال مشتريات</p>
                <p className="text-xs text-muted-foreground mt-1">التاريخ: {new Date(receiptData.date).toLocaleDateString('ar-BH')}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>المنتج:</span> <span className="font-medium">{receiptData.productName}</span></div>
                <div className="flex justify-between"><span>المشتري:</span> <span>{receiptData.buyerName || '-'}</span></div>
                <div className="flex justify-between"><span>الكمية:</span> <span>{receiptData.quantity}</span></div>
                <div className="flex justify-between border-t pt-2 mt-2"><span>الإجمالي:</span> <span className="font-bold text-lg">{receiptData.totalPrice.toFixed(2)} د.ب</span></div>
                <div className="flex justify-between"><span>طريقة الدفع:</span> <span>{receiptData.paymentMethod}</span></div>
              </div>
              <Button className="w-full" onClick={() => {
                const content = document.getElementById('sale-receipt-area')?.innerHTML;
                const printWindow = window.open('', '', 'height=600,width=800');
                if (printWindow && content) {
                  printWindow.document.write('<html><head><title>Receipt</title>');
                  printWindow.document.write('<style>body{font-family: sans-serif; direction: rtl;} .flex{display:flex; justify-content:space-between;}</style>');
                  printWindow.document.write('</head><body>');
                  printWindow.document.write(content);
                  printWindow.document.write('</body></html>');
                  printWindow.document.close();
                  printWindow.print();
                }
              }}>
                <Printer className="w-4 h-4 ml-2" /> طباعة
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
