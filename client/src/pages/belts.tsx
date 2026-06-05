import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Belt, InsertBelt } from "@shared/schema";
import { getBelts, createBelt, updateBelt, deleteBelt as deleteBeltData } from "@/lib/apiData";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { Plus, Trash2, Loader2, Pencil, Eye, Play, RotateCcw, Sparkles } from "lucide-react";

export default function Belts() {
    const { hasPermission } = useAuth();
    const { toast } = useToast();
    const { t } = useLanguage();
    const canAdd = hasPermission(PERMISSIONS.BELTS_CREATE);
    const canUpdate = hasPermission(PERMISSIONS.BELTS_UPDATE);
    const canDelete = hasPermission(PERMISSIONS.BELTS_DELETE);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [editingBelt, setEditingBelt] = useState<Belt | null>(null);
    const [formData, setFormData] = useState<Partial<InsertBelt>>({
        name: "",
        color: "#000000",
        order: 1,
    });

    const { data: belts, isLoading } = useQuery<Belt[]>({
        queryKey: ["/api/belts"],
        queryFn: getBelts
    });

    const sortedBelts = belts?.sort((a, b) => a.order - b.order) || [];

    const resetForm = () => {
        const nextOrder = (belts?.length || 0) + 1;
        setFormData({ name: "", color: "#000000", order: nextOrder });
    };

    const openCreateDialog = () => {
        setEditingBelt(null);
        resetForm();
        setIsDialogOpen(true);
    };

    const openEditDialog = (belt: Belt) => {
        setEditingBelt(belt);
        setFormData({ name: belt.name, color: belt.color, order: belt.order });
        setIsDialogOpen(true);
    };

    const handleDialogChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setEditingBelt(null);
            resetForm();
        }
    };

    const createBeltMutation = useMutation({
        mutationFn: async (data: InsertBelt) => {
            return await createBelt(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/belts"] });
            setIsDialogOpen(false);
            setEditingBelt(null);
            resetForm();
            toast({ title: t('common.success'), description: t('common.success') });
        },
        onError: (error: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: error.message });
        }
    });

    const updateBeltMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertBelt> }) => {
            return await updateBelt(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/belts"] });
            setIsDialogOpen(false);
            setEditingBelt(null);
            resetForm();
            toast({ title: t('common.success'), description: t('common.success') });
        },
        onError: (error: Error) => {
            toast({ variant: "destructive", title: t('common.error'), description: error.message });
        }
    });

    const deleteBeltMutation = useMutation({
        mutationFn: async (id: string) => {
            return await deleteBeltData(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/belts"] });
            toast({ title: t('common.success'), description: t('common.success') });
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: t('common.error'),
                description: error.message
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        if (editingBelt) {
            updateBeltMutation.mutate({ id: editingBelt.id, updates: formData });
            return;
        }
        createBeltMutation.mutate(formData as InsertBelt);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('belts.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('belts.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsPreviewOpen(true)} className="gap-2">
                        <Eye className="h-4 w-4" />
                        {t('belts.previewChain')}
                    </Button>

                    {canAdd && (
                        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                            <DialogTrigger asChild>
                                <Button onClick={openCreateDialog}>
                                    <Plus className="h-4 w-4 ml-2" />
                                    {t('belts.addBelt')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader><DialogTitle>{editingBelt ? t('common.edit') : t('belts.addBelt')}</DialogTitle></DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t('belts.beltName')}</Label>
                                        <Input
                                            placeholder={t("belts.namePlaceholder")}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('belts.order')}</Label>
                                            <Input
                                                type="number"
                                                value={formData.order}
                                                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('belts.color')}</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="color"
                                                    value={formData.color}
                                                    className="w-12 p-1"
                                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                />
                                                <Input
                                                    value={formData.color}
                                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                    className="flex-1 font-mono uppercase"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={createBeltMutation.isPending || updateBeltMutation.isPending}>
                                        {createBeltMutation.isPending || updateBeltMutation.isPending ? t('common.loading') : t('common.save')}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {belts?.sort((a, b) => a.order - b.order).map((belt) => (
                    <Card key={belt.id} className="overflow-hidden">
                        <div className="h-2 w-full" style={{ backgroundColor: belt.color }} />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">{belt.name}</CardTitle>
                            <div className="flex items-center gap-1">
                                {(canUpdate || canDelete) && (
                                    <>
                                        {canUpdate && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => openEditDialog(belt)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => {
                                                    if (confirm(`${t('common.deleteConfirm')} ${belt.name}?`)) {
                                                        deleteBeltMutation.mutate(belt.id);
                                                    }
                                                }}
                                            >
                                                {deleteBeltMutation.isPending && deleteBeltMutation.variables === belt.id ?
                                                    <Loader2 className="h-4 w-4 animate-spin" /> :
                                                    <Trash2 className="h-4 w-4" />
                                                }
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="inline-block w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: belt.color }}></span>
                                <span>{t('belts.order')}: {belt.order}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <BeltChainPreviewDialog
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                belts={sortedBelts}
            />
        </div>
    )
}

function BeltChainPreviewDialog({ open, onOpenChange, belts }: { open: boolean, onOpenChange: (open: boolean) => void, belts: Belt[] }) {
    const { t } = useLanguage();
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isAnimating, setIsAnimating] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isAnimating && activeIndex < belts.length - 1) {
            timer = setTimeout(() => {
                setActiveIndex(prev => prev + 1);
            }, 300); // Faster animation (was 600ms)
        } else if (activeIndex === belts.length - 1) {
            timer = setTimeout(() => {
                setIsAnimating(false);
            }, 500);
        }
        return () => clearTimeout(timer);
    }, [isAnimating, activeIndex, belts.length]);

    // Handle auto-scroll to focus on the active belt
    useEffect(() => {
        if (activeIndex >= 0 && scrollContainerRef.current) {
            const activeElement = scrollContainerRef.current.querySelector(`[data-index="${activeIndex}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeIndex]);

    const startAnimation = () => {
        setActiveIndex(-1);
        setIsAnimating(true);
    };

    useEffect(() => {
        if (open) {
            // Small delay to ensure dialog transition is smooth before starting
            const timer = setTimeout(() => {
                startAnimation();
            }, 400);
            return () => clearTimeout(timer);
        } else {
            setActiveIndex(-1);
            setIsAnimating(false);
        }
    }, [open]);

    const handleOpenChange = (newOpen: boolean) => {
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                        {t('belts.previewTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('belts.previewDescription')}
                    </DialogDescription>
                </DialogHeader>

                <div
                    ref={scrollContainerRef}
                    className="min-h-[450px] overflow-x-auto py-24 px-6 bg-muted/20 rounded-xl my-4 flex items-center justify-start scrollbar-hide"
                    style={{
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    <div className="flex items-center min-w-max mx-auto px-20">
                        {belts.map((belt, index) => (
                            <div key={belt.id} className="flex items-center">
                                <div
                                    data-index={index}
                                    className="relative flex flex-col items-center group"
                                >
                                    <div
                                        className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-500 z-10 relative
                                            ${index <= activeIndex
                                                ? 'border-primary shadow-2xl scale-125'
                                                : 'border-muted bg-muted opacity-40 grayscale translate-y-1'
                                            }
                                        `}
                                        style={{
                                            backgroundColor: index <= activeIndex ? belt.color : '#e2e8f0',
                                            boxShadow: index <= activeIndex ? `0 0 30px ${belt.color}66` : 'none'
                                        }}
                                    >
                                        {index <= activeIndex && (
                                            <div className="w-4 h-4 rounded-full bg-white shadow-inner" />
                                        )}
                                    </div>

                                    <div className="absolute top-full mt-6 flex flex-col items-center w-32 text-center">
                                        <div className={`font-bold text-sm transition-all duration-300 ${index <= activeIndex ? 'text-foreground scale-110' : 'text-muted-foreground opacity-50'}`}>
                                            {belt.name}
                                        </div>
                                        <div className={`text-[11px] font-mono mt-1 transition-colors duration-300 ${index <= activeIndex ? 'text-primary' : 'text-muted-foreground/60'}`}>
                                            {t('belts.order')} {belt.order}
                                        </div>
                                    </div>
                                </div>

                                {index < belts.length - 1 && (
                                    <div className={`h-2 w-20 sm:w-32 transition-all duration-500 rounded-full mx-[-2px] z-0
                                        ${index < activeIndex
                                            ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]'
                                            : 'bg-muted-foreground/10'
                                        }
                                    `} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-center gap-4 pt-4 border-t">
                    <Button
                        variant="ghost"
                        onClick={startAnimation}
                        disabled={isAnimating}
                        className="gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        {t('common.restart')}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                        className="px-8"
                    >
                        {t('common.close')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
