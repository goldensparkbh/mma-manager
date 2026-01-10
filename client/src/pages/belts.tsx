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
import { Plus, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Belt, InsertBelt } from "@shared/schema";

export default function Belts() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<InsertBelt>>({
        name: "",
        color: "#000000",
        order: 1,
    });

    const { data: belts, isLoading } = useQuery<Belt[]>({
        queryKey: ["/api/belts"],
    });

    const createBelt = useMutation({
        mutationFn: async (data: InsertBelt) => {
            const response = await apiRequest("POST", "/api/belts", data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/belts"] });
            setIsDialogOpen(false);
            setFormData({ name: "", color: "#000000", order: (belts?.length || 0) + 1 });
            toast({ title: "تم بنجاح", description: "تم إضافة الحزام بنجاح" });
        },
        onError: () => {
            toast({ variant: "destructive", title: "خطأ", description: "تعذر إضافة الحزام" });
        }
    });

    const deleteBelt = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/belts/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/belts"] });
            toast({ title: "تم بنجاح", description: "تم حذف الحزام" });
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message || "لا يمكن حذف الحزام لأنه ممنوح لأعضاء"
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        createBelt.mutate(formData as InsertBelt);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">إدارة الأحزمة</h1>
                    <p className="text-sm text-muted-foreground">تحديد الأحزمة وترتيبها وألوانها</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 ml-2" />
                            إضافة حزام
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>إضافة حزام جديد</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>اسم الحزام</Label>
                                <Input
                                    placeholder="مثال: الحزام الأبيض"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>الترتيب</Label>
                                    <Input
                                        type="number"
                                        value={formData.order}
                                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>اللون</Label>
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
                            <Button type="submit" className="w-full" disabled={createBelt.isPending}>
                                حفظ
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
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                    if (confirm(`هل أنت متأكد من حذف ${belt.name}؟`)) {
                                        deleteBelt.mutate(belt.id);
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="inline-block w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: belt.color }}></span>
                                <span>الترتيب: {belt.order}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
