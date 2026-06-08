import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Webhook } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";

type Hook = { id: string; url: string; isActive?: boolean; secret?: string };

export function WebhooksPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [lastSecret, setLastSecret] = useState("");

  const { data: hooks = [], isLoading } = useQuery<Hook[]>({
    queryKey: ["/api/webhooks"],
    queryFn: () => apiJson("/api/webhooks"),
  });

  const create = useMutation({
    mutationFn: () => apiJson<Hook>("/api/webhooks", { method: "POST", body: JSON.stringify({ url }) }),
    onSuccess: (data) => {
      setUrl("");
      setLastSecret(data.secret || "");
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: t("common.success"), description: t("webhooks.created") });
    },
    onError: (err) => toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Webhook className="h-4 w-4" />{t("webhooks.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("webhooks.hint")}</p>
        <div className="space-y-2">
          <Label>{t("webhooks.url")}</Label>
          <div className="flex gap-2">
            <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
            <Button disabled={!url || create.isPending} onClick={() => create.mutate()}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        {lastSecret && <p className="text-xs font-mono bg-muted p-2 rounded break-all">{t("webhooks.secret")}: {lastSecret}</p>}
        {hooks.map((h) => (
          <div key={h.id} className="text-sm border-b pb-2 break-all">{h.url}</div>
        ))}
      </CardContent>
    </Card>
  );
}
