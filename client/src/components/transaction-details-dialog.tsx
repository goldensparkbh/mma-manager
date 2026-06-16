import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/context/language-context";
import { Sale, Subscription } from "@shared/schema";
import { ar, enUS } from "date-fns/locale";
import { safeFormat } from "@/lib/formatDate";
import { Calendar, CreditCard, Package, User, Hash, Clock, FileText } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TransactionDetailsDialogProps {
    transaction: (Sale | Subscription & { type: 'sale' | 'subscription' }) | null;
    isOpen: boolean;
    onClose: () => void;
}

export function TransactionDetailsDialog({ transaction, isOpen, onClose }: TransactionDetailsDialogProps) {
    const { t, language } = useLanguage();
    const dir = language === "ar" ? "rtl" : "ltr";
    const locale = language === "ar" ? ar : enUS;

    if (!transaction) return null;

    const isSale = "type" in transaction && transaction.type === "sale";
    const sale = isSale ? (transaction as unknown as Sale) : null;
    const sub = !isSale ? (transaction as unknown as Subscription) : null;

    const formatDate = (dateStr: string) => safeFormat(dateStr, "PPP p", { locale, fallback: dateStr });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent dir={dir} className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {isSale ? t('sales.receiptTitle') : t('subscriptions.receiptTitle')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Header Info */}
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-muted-foreground">{t('common.date')}</p>
                            <p className="font-medium">{formatDate(isSale ? sale!.date : sub!.startDate)}</p>
                        </div>
                        <Badge variant={isSale ? "outline" : "default"}>
                            {isSale ? t('nav.store') : t('nav.subscriptions')}
                        </Badge>
                    </div>

                    <div className="grid gap-4">
                        {/* Customer/Member Info */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-xs text-muted-foreground uppercase letter-spacing-wider font-semibold">
                                    {isSale ? t('sales.buyer') : t('subscriptions.member')}
                                </p>
                                <p className="font-medium text-sm">
                                    {isSale
                                        ? (sale!.buyerName || t('sales.defaultBuyer'))
                                        : sub!.memberName
                                    }
                                </p>
                                {isSale && sale!.buyerPhone && (
                                    <p className="text-xs text-muted-foreground">{sale!.buyerPhone}</p>
                                )}
                            </div>
                        </div>

                        {/* Product/Plan Info */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            {isSale ? <Package className="h-5 w-5 text-muted-foreground mt-0.5" /> : <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />}
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground uppercase letter-spacing-wider font-semibold">
                                    {isSale ? t('sales.product') : t('subscriptions.package')}
                                </p>
                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-sm">{isSale ? sale!.productName : sub!.planName}</p>
                                    {isSale && <p className="text-sm font-semibold">x{sale!.quantity}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Amount Info */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 text-primary-foreground border border-primary/10">
                            <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                            <div className="flex-1">
                                <p className="text-xs text-primary/70 uppercase letter-spacing-wider font-semibold">
                                    {t('common.amount')}
                                </p>
                                <p className="text-lg font-bold text-primary">
                                    {formatMoney(isSale ? sale!.totalPrice : sub!.amount)} {t('common.currency')}
                                </p>
                            </div>
                        </div>

                        {/* Extra Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">{t('finance.paymentMethod')}</p>
                                    <p className="text-xs font-medium">
                                        {isSale
                                            ? (sale!.paymentMethod ? t(`finance.paymentMethods.${sale!.paymentMethod}`) : "-")
                                            : (sub!.paymentMethod ? t(`finance.paymentMethods.${sub!.paymentMethod}`) : "-")
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">{t('subscriptions.paymentStatus')}</p>
                                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                        {isSale
                                            ? (sale!.status === "cancelled" ? t('sales.statusCancelled') : t('sales.statusCompleted'))
                                            : t(`subscriptions.${sub!.paymentStatus || 'unpaid'}`)
                                        }
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
