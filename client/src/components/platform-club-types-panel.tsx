import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiFetch, apiJson } from "@/lib/api";
import { ImagePlus, Loader2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ClubTypeRow = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
  category: string;
  sortOrder: number;
  isActive: boolean;
};

export function PlatformClubTypesPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<ClubTypeRow | null>(null);
  const [form, setForm] = useState({
    nameEn: "",
    nameAr: "",
    descriptionEn: "",
    descriptionAr: "",
    imageUrl: "",
    isActive: true,
  });
  const [uploading, setUploading] = useState(false);

  const { data: rows = [], isLoading } = useQuery<ClubTypeRow[]>({
    queryKey: ["/api/platform/club-types"],
    queryFn: () => apiJson("/api/platform/club-types"),
  });

  const save = useMutation({
    mutationFn: () =>
      apiJson(`/api/platform/club-types/${editing!.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          descriptionEn: form.descriptionEn.trim() || null,
          descriptionAr: form.descriptionAr.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
          isActive: form.isActive,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/platform/club-types"] });
      qc.invalidateQueries({ queryKey: ["/api/club-types"] });
      setEditing(null);
      toast({ title: t("common.success"), description: t("platformAdmin.clubTypes.saved") });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: t("common.error"), description: e.message }),
  });

  const openEdit = (row: ClubTypeRow) => {
    setEditing(row);
    setForm({
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      descriptionEn: row.descriptionEn ?? "",
      descriptionAr: row.descriptionAr ?? "",
      imageUrl: row.imageUrl ?? "",
      isActive: row.isActive,
    });
  };

  const onPickFile = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch("/api/platform/club-types/upload", { method: "POST", body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error || "Upload failed");
      }
      const { url } = (await res.json()) as { url: string };
      setForm((f) => ({ ...f, imageUrl: url }));
      toast({ title: t("common.success"), description: t("platformAdmin.clubTypes.imageUploaded") });
    } catch (e) {
      toast({ variant: "destructive", title: t("common.error"), description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("platformAdmin.clubTypes.title")}</CardTitle>
          <CardDescription>{t("platformAdmin.clubTypes.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl border bg-card overflow-hidden">
                  <div className="aspect-[4/3] bg-muted relative">
                    {row.imageUrl ? (
                      <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        {row.id}
                      </div>
                    )}
                    {!row.isActive ? (
                      <span className="absolute top-2 end-2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium">
                        {t("platformAdmin.clubTypes.inactive")}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-semibold text-sm leading-tight">{row.nameEn}</p>
                    <p className="text-sm text-muted-foreground leading-tight" dir="rtl">
                      {row.nameAr}
                    </p>
                    <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={() => openEdit(row)}>
                      <Pencil className="h-3.5 w-3.5 me-1.5" />
                      {t("common.edit")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("platformAdmin.clubTypes.editTitle")}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground font-mono">{editing.id}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("platformAdmin.clubTypes.nameEn")}</Label>
                  <Input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("platformAdmin.clubTypes.nameAr")}</Label>
                  <Input value={form.nameAr} dir="rtl" onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("platformAdmin.clubTypes.descEn")}</Label>
                  <Textarea rows={3} value={form.descriptionEn} onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("platformAdmin.clubTypes.descAr")}</Label>
                  <Textarea rows={3} dir="rtl" value={form.descriptionAr} onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("platformAdmin.clubTypes.image")}</Label>
                <p className="text-xs text-muted-foreground">{t("platformAdmin.clubTypes.imageHint")}</p>
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="h-24 w-24 rounded-lg border object-contain bg-muted" />
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onPickFile(file);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <ImagePlus className="h-4 w-4 me-2" />}
                  {t("platformAdmin.clubTypes.uploadImage")}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="club-type-active">{t("platformAdmin.clubTypes.active")}</Label>
                <Switch id="club-type-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.nameEn.trim() || !form.nameAr.trim()}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
