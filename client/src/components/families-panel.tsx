import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import type { Member } from "@shared/schema";

type FamilyRow = { id: string; name: string; memberCount?: number };
type FamilyDetail = FamilyRow & {
  members: { id: string; name: string; phone?: string; relationship?: string }[];
};

export function FamiliesPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addMemberId, setAddMemberId] = useState("");
  const [portalPhone, setPortalPhone] = useState("");
  const [portalPassword, setPortalPassword] = useState("");

  const { data: families = [], isLoading } = useQuery<FamilyRow[]>({
    queryKey: ["/api/families"],
    queryFn: () => apiJson("/api/families"),
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: familyDetail, isLoading: loadingDetail } = useQuery<FamilyDetail>({
    queryKey: ["/api/families", expandedId],
    queryFn: () => apiJson(`/api/families/${expandedId}`),
    enabled: !!expandedId,
  });

  const create = useMutation({
    mutationFn: () =>
      apiJson("/api/families", {
        method: "POST",
        body: JSON.stringify({
          name,
          memberIds: selectedMemberIds,
          primaryMemberId: selectedMemberIds[0],
        }),
      }),
    onSuccess: () => {
      setName("");
      setSelectedMemberIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
      toast({ title: t("common.success") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const addMember = useMutation({
    mutationFn: (familyId: string) =>
      apiJson(`/api/families/${familyId}/members`, {
        method: "POST",
        body: JSON.stringify({ memberId: addMemberId }),
      }),
    onSuccess: () => {
      setAddMemberId("");
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
      queryClient.invalidateQueries({ queryKey: ["/api/families", expandedId] });
      toast({ title: t("common.success") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const enablePortal = useMutation({
    mutationFn: (familyId: string) =>
      apiJson(`/api/families/${familyId}/portal-access`, {
        method: "POST",
        body: JSON.stringify({ phone: portalPhone, password: portalPassword }),
      }),
    onSuccess: () => {
      setPortalPhone("");
      setPortalPassword("");
      toast({ title: t("families.portalEnabled") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          {t("families.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 border rounded-lg p-4">
          <Label>{t("families.new")}</Label>
          <Input
            placeholder={t("families.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
            {members.slice(0, 50).map((m) => (
              <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                />
                <span>{m.name}</span>
              </label>
            ))}
          </div>
          <Button
            disabled={!name || selectedMemberIds.length === 0 || create.isPending}
            onClick={() => create.mutate()}
          >
            <Plus className="h-4 w-4 me-2" />
            {t("families.create")}
          </Button>
        </div>

        {families.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("families.empty")}</p>
        ) : (
          families.map((f) => (
            <div key={f.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{f.name}</span>
                  <Badge variant="secondary" className="ms-2 text-[10px]">
                    {f.memberCount ?? 0} {t("families.members")}
                  </Badge>
                </div>
                <Dialog
                  open={expandedId === f.id}
                  onOpenChange={(open) => setExpandedId(open ? f.id : null)}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      {t("common.details")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{f.name}</DialogTitle>
                    </DialogHeader>
                    {loadingDetail ? (
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">{t("families.members")}</p>
                          {familyDetail?.members?.map((m) => (
                            <div key={m.id} className="text-sm border-b pb-1">
                              {m.name}
                              {m.relationship && (
                                <span className="text-muted-foreground ms-2">({m.relationship})</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Select value={addMemberId} onValueChange={setAddMemberId}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder={t("families.addMember")} />
                            </SelectTrigger>
                            <SelectContent>
                              {members.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            disabled={!addMemberId || addMember.isPending}
                            onClick={() => addMember.mutate(f.id)}
                          >
                            {t("common.add")}
                          </Button>
                        </div>
                        <div className="space-y-2 border-t pt-4">
                          <p className="text-sm font-medium">{t("families.portalAccess")}</p>
                          <Input
                            placeholder={t("members.phone")}
                            value={portalPhone}
                            onChange={(e) => setPortalPhone(e.target.value)}
                          />
                          <Input
                            type="password"
                            placeholder={t("families.portalPassword")}
                            value={portalPassword}
                            onChange={(e) => setPortalPassword(e.target.value)}
                          />
                          <Button
                            disabled={!portalPhone || portalPassword.length < 6 || enablePortal.isPending}
                            onClick={() => enablePortal.mutate(f.id)}
                          >
                            {t("families.enablePortal")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
