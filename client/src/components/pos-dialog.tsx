import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/hooks/use-toast";
import { Product, InsertSale, Member } from "@shared/schema";
import { createSale } from "@/lib/apiData";
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Package, X, Loader2, Printer, CheckCircle2 } from "lucide-react";
import { printReceipt } from "@/lib/receipt-printer";
import { useAuth } from "@/context/auth-context";
import { ReceiptTypeDialog } from "./receipt-type-dialog";

interface POSDialogProps {
    isOpen: boolean;
    onClose: () => void;
    member: Member;
}

interface CartItem {
    product: Product;
    quantity: number;
}

export function POSDialog({ isOpen, onClose, member }: POSDialogProps) {
    const { t, dir, language } = useLanguage();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<string>("cash");
    const [paymentType, setPaymentType] = useState<"pay_now" | "pay_later">("pay_now");
    const [lastSaleData, setLastSaleData] = useState<any>(null);
    const [isReceiptTypeDialogOpen, setIsReceiptTypeDialogOpen] = useState(false);
    const { clubSettings } = useAuth();

    const { data: products } = useQuery<Product[]>({
        queryKey: ["/api/products"],
        enabled: isOpen
    });

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    const categories = useMemo(() => {
        if (!products) return [];
        const cats = new Set(products.map(p => p.category));
        return ["all", ...Array.from(cats)];
    }, [products]);

    const getCategoryLabel = (category: string) => {
        if (category === "all") return t("common.all");
        const key = `store.categories.${category}`;
        const label = t(key);
        return label === key ? category : label;
    };

    const addToCart = (product: Product) => {
        if (product.stock <= 0) return;
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) {
                    toast({ title: t('common.warning'), description: t('store.outOfStock'), variant: "destructive" });
                    return prev;
                }
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta;
                if (newQty <= 0) return item;
                if (newQty > item.product.stock) {
                    toast({ title: t('common.warning'), description: t('store.outOfStock'), variant: "destructive" });
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            const receiptId = `R${Date.now().toString().slice(-6)}${member.id.slice(0, 4).toUpperCase()}`;
            const promises = cart.map(item => {
                const saleData: InsertSale = {
                    productId: item.product.id,
                    productName: item.product.name,
                    quantity: item.quantity,
                    unitPrice: item.product.price,
                    totalPrice: item.product.price * item.quantity,
                    memberId: member.id,
                    buyerName: member.name,
                    buyerPhone: member.phone,
                    date: new Date().toISOString(),
                    paymentMethod: paymentType === "pay_now" ? paymentMethod : null,
                    paymentStatus: paymentType === "pay_now" ? "paid" : "unpaid",
                    status: "completed",
                    receiptId: receiptId
                };
                return createSale(saleData);
            });
            return Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
            queryClient.invalidateQueries({ queryKey: ["/api/sales/member", member.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({
                title: t('common.success'),
                description: t('store.purchaseSuccess'),
            });

            // Prepare data for receipt
            const receiptId = `R${Date.now().toString().slice(-6)}${member.id.slice(0, 4).toUpperCase()}`;
            setLastSaleData({
                id: receiptId,
                buyerName: member.name,
                memberDisplayId: member.memberId,
                items: cart.map(item => ({
                    id: item.product.id,
                    productName: item.product.name,
                    quantity: item.quantity,
                    unitPrice: item.product.price,
                    totalPrice: item.product.price * item.quantity
                })),
                totalPrice: totalAmount,
                paymentStatus: paymentType === "pay_now" ? "paid" : "unpaid",
                date: new Date().toISOString()
            });

            setCart([]);
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: t('common.error'),
                description: error.message,
            });
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent dir={dir} className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden gap-0 text-start">
                <DialogHeader className="sr-only">
                    <DialogTitle>{t("store.posTitle").replace("{name}", member.name)}</DialogTitle>
                </DialogHeader>

                {lastSaleData ? (
                    <div className="absolute inset-0 bg-background/95 z-50 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 text-green-600">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">{t("store.purchaseSuccess")}</h2>
                        <p className="text-muted-foreground mb-8">{t("sales.invoiceNumber")}: #{lastSaleData.id}</p>

                        <div className="flex flex-col w-full max-w-xs gap-3">
                            <Button
                                size="lg"
                                className="w-full gap-2"
                                onClick={() => setIsReceiptTypeDialogOpen(true)}
                            >
                                <Printer className="w-5 h-5" />
                                {t("sales.printReceipt")}
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full"
                                onClick={() => {
                                    setLastSaleData(null);
                                    onClose();
                                }}
                            >
                                {t("common.close")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-1 h-full overflow-hidden">
                        {/* Left: Product Grid */}
                        <div className="flex-1 flex flex-col border-e bg-muted/5">
                            <div className="p-4 border-b space-y-4 bg-background">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('common.search')}
                                            className="ps-8"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                    {categories.map(cat => (
                                        <Badge
                                            key={cat}
                                            variant={selectedCategory === cat ? "default" : "outline"}
                                            className="cursor-pointer"
                                            onClick={() => setSelectedCategory(cat)}
                                        >
                                            {getCategoryLabel(cat)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <ScrollArea className="flex-1 p-4">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {filteredProducts.map(product => (
                                        <Card
                                            key={product.id}
                                            className={`
                                    cursor-pointer transition-all hover:bg-muted/50 hover:border-primary/50 relative overflow-hidden group
                                    ${product.stock <= 0 ? 'opacity-50 grayscale' : ''}
                                `}
                                            onClick={() => addToCart(product)}
                                        >
                                            <div className="aspect-square bg-muted p-4 flex items-center justify-center relative">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-md" />
                                                ) : (
                                                    <Package className="h-12 w-12 text-muted-foreground/30" />
                                                )}
                                                {product.stock <= 0 && (
                                                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center font-bold text-destructive rotate-[-12deg] border-2 border-destructive m-4 rounded">
                                                        {t('store.outOfStock')}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <div className="font-semibold truncate">{product.name}</div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="font-bold text-primary">{product.price} {t("common.currency")}</span>
                                                    <span className="text-xs text-muted-foreground">{t("store.stock")}: {product.stock}</span>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Right: Cart */}
                        <div className="w-[400px] flex flex-col bg-background h-full">
                            <div className="p-4 border-b flex items-center justify-between text-start">
                                <h2 className="font-semibold flex items-center gap-2 text-start">
                                    <ShoppingCart className="h-5 w-5" />
                                    {t('store.cart')}
                                </h2>
                                <Badge variant="secondary">{t("store.itemsCount").replace("{count}", String(cart.length))}</Badge>
                            </div>

                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-3">
                                    {cart.map(item => (
                                        <div key={item.product.id} className="flex gap-3 items-center border rounded-lg p-2 bg-card">
                                            <div className="h-12 w-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                                {item.product.imageUrl ? (
                                                    <img src={item.product.imageUrl} className="h-full w-full object-cover rounded" />
                                                ) : (
                                                    <Package className="h-6 w-6 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 text-start">
                                                <div className="font-medium truncate text-start">{item.product.name}</div>
                                                <div className="text-sm text-muted-foreground text-start">{item.product.price} {t("common.currency")}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, -1)}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, 1)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {cart.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            {t('store.cartEmpty')}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="p-4 border-t bg-muted/10 space-y-4">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>{t('store.total')}</span>
                                        <span>{totalAmount.toFixed(3)} {t("common.currency")}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant={paymentType === "pay_now" ? "default" : "outline"}
                                            onClick={() => setPaymentType("pay_now")}
                                            className="w-full"
                                        >
                                            <Banknote className="me-2 h-4 w-4" />
                                            {t("store.payNow")}
                                        </Button>
                                        <Button
                                            variant={paymentType === "pay_later" ? "default" : "outline"}
                                            onClick={() => setPaymentType("pay_later")}
                                            className="w-full"
                                        >
                                            <CreditCard className="me-2 h-4 w-4" />
                                            {t("store.addToAccount")}
                                        </Button>
                                    </div>

                                    {paymentType === "pay_now" && (
                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">{t("finance.paymentMethods.cash")}</SelectItem>
                                                <SelectItem value="card">{t("finance.paymentMethods.card")}</SelectItem>
                                                <SelectItem value="transfer">{t("finance.paymentMethods.transfer")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                <Button
                                    className="w-full size-lg text-lg"
                                    disabled={cart.length === 0 || checkoutMutation.isPending}
                                    onClick={() => checkoutMutation.mutate()}
                                >
                                    {checkoutMutation.isPending ? <Loader2 className="animate-spin me-2" /> : null}
                                    {t('store.checkout')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
                <ReceiptTypeDialog
                    isOpen={isReceiptTypeDialogOpen}
                    onClose={() => setIsReceiptTypeDialogOpen(false)}
                    onSelect={(format) => {
                        if (lastSaleData) {
                            printReceipt({
                                type: 'sale',
                                data: lastSaleData,
                                settings: clubSettings,
                                language: language as any,
                                t,
                                format
                            });
                        }
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}
