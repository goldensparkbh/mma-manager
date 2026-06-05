import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Receipt } from "lucide-react";
import { useLanguage } from "@/context/language-context";

interface ReceiptTypeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'thermal' | 'a4') => void;
    title?: string;
}

export function ReceiptTypeDialog({ isOpen, onClose, onSelect, title }: ReceiptTypeDialogProps) {
    const { t, language } = useLanguage();
    const dir = language === "ar" ? "rtl" : "ltr";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent dir={dir} className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="h-5 w-5 text-primary" />
                        {title || t('sales.printReceipt')}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <Button
                        variant="outline"
                        className="h-32 flex flex-col items-center justify-center gap-4 hover:border-primary hover:bg-primary/5 transition-all group"
                        onClick={() => {
                            onSelect('thermal');
                            onClose();
                        }}
                    >
                        <div className="p-3 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
                            <Receipt className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-lg">{t('settings.receipts.thermalTitle')}</div>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-32 flex flex-col items-center justify-center gap-4 hover:border-primary hover:bg-primary/5 transition-all group"
                        onClick={() => {
                            onSelect('a4');
                            onClose();
                        }}
                    >
                        <div className="p-3 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
                            <FileText className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-lg">{t('settings.receipts.a4Title')}</div>
                        </div>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
