import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShoppingBag, TrendingUp, Package } from "lucide-react";
import type { Sale } from "@shared/schema";

export default function Sales() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const filteredSales = sales?.filter((sale) => {
    const matchesSearch =
      sale.productName.includes(searchQuery) ||
      sale.buyerName?.includes(searchQuery) ||
      false;
    const matchesDate = !selectedDate || sale.date === selectedDate;
    return matchesSearch && matchesDate;
  });

  const totalSales = filteredSales?.reduce((sum, sale) => sum + sale.totalPrice, 0) ?? 0;
  const totalItems = filteredSales?.reduce((sum, sale) => sum + sale.quantity, 0) ?? 0;
  const uniqueProducts = new Set(filteredSales?.map((sale) => sale.productId)).size;

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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">المنتج</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الكمية</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">سعر الوحدة</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الإجمالي</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">التاريخ</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">الدفع</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales && filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-b last:border-0 hover-elevate" data-testid={`row-sale-${sale.id}`}>
                      <td className="py-3 px-3 font-medium">{sale.productName}</td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary">{sale.quantity}</Badge>
                      </td>
                      <td className="py-3 px-3">{sale.unitPrice.toFixed(2)} د.ب</td>
                      <td className="py-3 px-3 font-medium">{sale.totalPrice.toFixed(2)} د.ب</td>
                      <td className="py-3 px-3 text-muted-foreground">{formatDate(sale.date)}</td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary">
                          {sale.paymentMethod === "cash"
                            ? "نقداً"
                            : sale.paymentMethod === "card"
                            ? "بطاقة"
                            : "تحويل"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      {searchQuery || selectedDate ? "لا توجد نتائج للبحث" : "لا توجد مبيعات حالياً"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
