import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiFetch, apiJson } from "@/lib/api";
import { getAllClubTypes } from "@shared/clubTypes";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Megaphone,
  Trash2,
} from "lucide-react";

type PromoBannerLocale = "en" | "ar";

type PromoBanner = {
  id: string;
  sortOrder: number;
  locale: PromoBannerLocale;
  imageUrl: string;
  clubTypeId: string | null;
  linkUrl: string | null;
  isActive: boolean;
};

const CLUB_TYPES = getAllClubTypes();

function BannerLocalePanel({
  locale,
  banners,
  onInvalidate,
}: {
  locale: PromoBannerLocale;
  banners: PromoBanner[];
  onInvalidate: () => void;
}) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [clubTypeId, setClubTypeId] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const localeBanners = banners.filter((b) => b.locale === locale);

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiJson("/api/platform/promo-banners/reorder", {
        method: "PUT",
        body: JSON.stringify({ orderedIds, locale }),
      }),
    onSuccess: onInvalidate,
    onError: (e: Error) => toast({ variant: "destructive", title: t("common.error"), description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiJson(`/api/platform/promo-banners/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      onInvalidate();
      toast({ title: t("common.success"), description: t("platformAdmin.ads.removed") });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: t("common.error"), description: e.message }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiJson(`/api/platform/promo-banners/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: onInvalidate,
    onError: (e: Error) => toast({ variant: "destructive", title: t("common.error"), description: e.message }),
  });

  const move = (index: number, direction: -1 | 1) => {
    const next = [...localeBanners];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next.map((b) => b.id));
  };

  const onPickFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await apiFetch("/api/platform/promo-banners/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: uploadRes.statusText }));
        throw new Error((err as { error?: string }).error || "Upload failed");
      }
      const { url } = (await uploadRes.json()) as { url: string };
      await apiJson("/api/platform/promo-banners", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: url,
          locale,
          clubTypeId: clubTypeId || null,
          linkUrl: linkUrl.trim() || null,
        }),
      });
      setClubTypeId("");
      setLinkUrl("");
      onInvalidate();
      toast({ title: t("common.success"), description: t("platformAdmin.ads.added") });
    } catch (e) {
      toast({ variant: "destructive", title: t("common.error"), description: (e as Error).message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            {locale === "en" ? t("platformAdmin.ads.addTitleEn") : t("platformAdmin.ads.addTitleAr")}
          </CardTitle>
          <CardDescription>
            {locale === "en" ? t("platformAdmin.ads.addDescEn") : t("platformAdmin.ads.addDescAr")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("platformAdmin.ads.sportFilter")}</Label>
              <Select value={clubTypeId || "__none__"} onValueChange={(v) => setClubTypeId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("platformAdmin.ads.sportFilterNone")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("platformAdmin.ads.sportFilterNone")}</SelectItem>
                  {CLUB_TYPES.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {language === "ar" ? ct.nameAr : ct.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("platformAdmin.ads.sportFilterHint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("platformAdmin.ads.linkUrl")}</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
              <p className="text-xs text-muted-foreground">{t("platformAdmin.ads.linkUrlHint")}</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPickFile(file);
            }}
          />
          <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImagePlus className="h-4 w-4 mr-2" />}
            {uploading ? t("platformAdmin.ads.uploading") : t("platformAdmin.ads.uploadButton")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("platformAdmin.ads.aspectHint")}</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>
            {locale === "en" ? t("platformAdmin.ads.listTitleEn") : t("platformAdmin.ads.listTitleAr")}
          </CardTitle>
          <CardDescription>{t("platformAdmin.ads.listDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {localeBanners.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center space-y-2 bg-muted/30">
              <Megaphone className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="font-medium">{t("platformAdmin.ads.empty")}</p>
              <p className="text-sm text-muted-foreground">
                {locale === "en" ? t("platformAdmin.ads.emptySubEn") : t("platformAdmin.ads.emptySubAr")}
              </p>
            </div>
          ) : (
            localeBanners.map((banner, index) => (
              <div key={banner.id} className="flex flex-col sm:flex-row gap-4 rounded-xl border p-3 bg-card">
                <div className="relative w-full sm:w-48 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                  <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>#{index + 1}</span>
                    {banner.clubTypeId ? (
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                        {CLUB_TYPES.find((c) => c.id === banner.clubTypeId)?.[language === "ar" ? "nameAr" : "nameEn"] ||
                          banner.clubTypeId}
                      </span>
                    ) : null}
                    {banner.linkUrl ? <span className="truncate text-xs">{banner.linkUrl}</span> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={index === localeBanners.length - 1 || reorder.isPending}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={banner.isActive}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: banner.id, isActive: checked })}
                      />
                      <span className="text-sm">{t("platformAdmin.ads.active")}</span>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="ms-auto"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(banner.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PlatformPromoBannersPanel() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: banners = [], isLoading } = useQuery<PromoBanner[]>({
    queryKey: ["/api/platform/promo-banners"],
    queryFn: () => apiJson("/api/platform/promo-banners"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/platform/promo-banners"] });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enCount = banners.filter((b) => b.locale === "en").length;
  const arCount = banners.filter((b) => b.locale === "ar").length;

  return (
    <div className="space-y-6 max-w-4xl">
      <Tabs defaultValue="en">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="en">
            {t("platformAdmin.ads.tabEn")} ({enCount})
          </TabsTrigger>
          <TabsTrigger value="ar">
            {t("platformAdmin.ads.tabAr")} ({arCount})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="en" className="mt-6">
          <BannerLocalePanel locale="en" banners={banners} onInvalidate={invalidate} />
        </TabsContent>
        <TabsContent value="ar" className="mt-6">
          <BannerLocalePanel locale="ar" banners={banners} onInvalidate={invalidate} />
        </TabsContent>
      </Tabs>

      <Card className="shadow-sm border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("platformAdmin.ads.placeholderNote")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
