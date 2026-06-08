import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";

type Branch = { id: string; name: string; address?: string; phone?: string; isDefault?: boolean };

export function BranchesPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: () => apiJson("/api/branches"),
  });

  const create = useMutation({
    mutationFn: () => apiJson("/api/branches", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: t("common.success") });
    },
    onError: (err) => toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiJson(`/api/branches/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/branches"] }),
  });

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />{t("branches.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder={t("branches.name")} value={name} onChange={(e) => setName(e.target.value)} />
          <Button disabled={!name || create.isPending} onClick={() => create.mutate()}><Plus className="h-4 w-4" /></Button>
        </div>
        {branches.map((b) => (
          <div key={b.id} className="flex items-center justify-between border-b pb-2 text-sm">
            <div>
              <span className="font-medium">{b.name}</span>
              {b.isDefault && <Badge className="ms-2 text-[10px]">{t("branches.default")}</Badge>}
            </div>
            {!b.isDefault && (
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
