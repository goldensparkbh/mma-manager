import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";

type Camp = {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  eventType?: string;
  capacity?: number;
  price?: number;
  isPublic?: boolean;
};

const empty = (): Partial<Camp> => ({
  title: "",
  description: "",
  startDate: new Date().toISOString().slice(0, 16),
  endDate: "",
  eventType: "camp",
  capacity: 30,
  price: 0,
  isPublic: true,
});

export default function CampsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Camp>>(empty());

  const { data: camps = [], isLoading } = useQuery<Camp[]>({
    queryKey: ["/api/camps"],
    queryFn: () => apiJson("/api/camps"),
  });

  const save = useMutation({
    mutationFn: () => apiJson("/api/camps", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/camps"] });
      setOpen(false);
      setForm(empty());
      toast({ title: t("common.success") });
    },
    onError: (err) => toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarRange className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t("camps.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("camps.subtitle")}</p>
          </div>
        </div>
        <Button onClick={() => { setForm(empty()); setOpen(true); }}><Plus className="h-4 w-4 me-2" />{t("camps.new")}</Button>
      </div>

      {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {camps.map((camp) => (
            <Card key={camp.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between gap-2">
                  {camp.title}
                  <Badge variant="outline">{camp.eventType || "camp"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1 text-muted-foreground">
                <p>{new Date(camp.startDate).toLocaleString()}</p>
                {camp.capacity && <p>{t("camps.capacity")}: {camp.capacity}</p>}
                {camp.price != null && <p>{camp.price} BHD</p>}
                {camp.isPublic && <Badge>{t("camps.public")}</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("camps.new")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>{t("camps.name")}</Label><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t("schedule.description")}</Label><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>{t("camps.start")}</Label><Input type="datetime-local" value={(form.startDate || "").slice(0, 16)} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("camps.capacity")}</Label><Input type="number" value={form.capacity ?? 30} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.isPublic !== false} onCheckedChange={(v) => setForm({ ...form, isPublic: v })} /><Label>{t("camps.public")}</Label></div>
          </div>
          <DialogFooter>
            <Button onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
