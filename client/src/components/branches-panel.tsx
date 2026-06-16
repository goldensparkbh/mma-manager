import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";

type Branch = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  country?: string | null;
  isDefault?: boolean;
};

type BranchAccessScope = "home_branch" | "same_country" | "all_branches";

const COUNTRY_OPTIONS = [
  { code: "BH", labelEn: "Bahrain", labelAr: "البحرين" },
  { code: "SA", labelEn: "Saudi Arabia", labelAr: "السعودية" },
  { code: "QA", labelEn: "Qatar", labelAr: "قطر" },
  { code: "OM", labelEn: "Oman", labelAr: "عُمان" },
  { code: "KW", labelEn: "Kuwait", labelAr: "الكويت" },
];

export function BranchesPanel() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: () => apiJson("/api/branches"),
  });

  const { data: settings } = useQuery<{ branchAccessScope?: BranchAccessScope }>({
    queryKey: ["/api/settings"],
    queryFn: () => apiJson("/api/settings"),
  });

  const scope = settings?.branchAccessScope || "home_branch";

  const create = useMutation({
    mutationFn: () =>
      apiJson("/api/branches", {
        method: "POST",
        body: JSON.stringify({ name, country: country || null }),
      }),
    onSuccess: () => {
      setName("");
      setCountry("");
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: t("common.success") });
    },
    onError: (err) => toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiJson(`/api/branches/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/branches"] }),
  });

  const updateBranch = useMutation({
    mutationFn: ({ id, ...body }: { id: string; country?: string | null }) =>
      apiJson(`/api/branches/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/branches"] }),
  });

  const saveScope = useMutation({
    mutationFn: (branchAccessScope: BranchAccessScope) =>
      apiJson("/api/settings", { method: "PATCH", body: JSON.stringify({ branchAccessScope }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: t("common.success") });
    },
    onError: (err) => toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {t("branches.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t("branches.accessScope")}</Label>
          <Select
            value={scope}
            onValueChange={(v) => saveScope.mutate(v as BranchAccessScope)}
            disabled={saveScope.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home_branch">{t("branches.accessScopeHome")}</SelectItem>
              <SelectItem value="same_country">{t("branches.accessScopeCountry")}</SelectItem>
              <SelectItem value="all_branches">{t("branches.accessScopeAll")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("branches.accessScopeHint")}</p>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>{t("branches.addBranch")}</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder={t("branches.name")} value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Select value={country || "none"} onValueChange={(v) => setCountry(v === "none" ? "" : v)}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder={t("branches.country")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("branches.countryDefault")}</SelectItem>
                {COUNTRY_OPTIONS.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {language === "ar" ? c.labelAr : c.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!name || create.isPending} onClick={() => create.mutate()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {branches.map((b) => (
          <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 text-sm">
            <div className="min-w-0">
              <span className="font-medium">{b.name}</span>
              {b.isDefault && <Badge className="ms-2 text-[10px]">{t("branches.default")}</Badge>}
              {b.address ? <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.address}</p> : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select
                value={b.country?.toUpperCase() || "none"}
                onValueChange={(v) =>
                  updateBranch.mutate({ id: b.id, country: v === "none" ? null : v })
                }
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder={t("branches.country")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("branches.countryDefault")}</SelectItem>
                  {COUNTRY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {language === "ar" ? c.labelAr : c.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!b.isDefault && (
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove.mutate(b.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
