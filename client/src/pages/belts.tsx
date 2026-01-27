import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Belt, InsertBelt } from "@shared/schema";
import { getBelts, createBelt, updateBelt, deleteBelt as deleteBeltData } from "@/lib/firebaseData";
import { useLanguage } from "@/context/language-context";
import { Plus, Trash2, Loader2, Pencil } from "lucide-react";

export default function Belts() {
    const { toast } = useToast();
    const { t } = useLanguage();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {belts?.map((belt) => (
                    <Card key={belt.id} className="overflow-hidden">
                        <div className="h-2 w-full" style={{ backgroundColor: belt.color }} />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">{belt.name}</CardTitle>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => openEditDialog(belt)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
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
        </div>
    )
}
