import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { Bell, Loader2, Send, Settings2, Smartphone, Users } from "lucide-react";

type PushConfig = {
  enabled: boolean;
  webPopupsEnabled: boolean;
  expoProjectId: string;
  expoAccessToken: string;
  hasAccessToken?: boolean;
};

type PushStats = {
  webStaffUsers: number;
  mobileMemberDevices: number;
  mobileStaffDevices: number;
  totalBroadcasts: number;
};

type Broadcast = {
  id: string;
  title: string;
  body: string;
  linkUrl?: string;
  targets: string[];
  webStaffCount?: number;
  mobileMemberSent?: number;
  mobileStaffSent?: number;
  createdByEmail?: string;
  createdAt?: string;
};

const TARGETS = [
  { id: "web_staff", labelKey: "platformAdmin.push.targetWebStaff", icon: Users },
  { id: "mobile_member", labelKey: "platformAdmin.push.targetMobileMember", icon: Smartphone },
  { id: "mobile_staff", labelKey: "platformAdmin.push.targetMobileStaff", icon: Bell },
] as const;

export function PlatformPushPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ config: PushConfig; stats: PushStats }>({
    queryKey: ["/api/platform/push/config"],
    queryFn: () => apiJson("/api/platform/push/config"),
  });

  const { data: broadcasts = [], isLoading: loadingHistory } = useQuery<Broadcast[]>({
    queryKey: ["/api/platform/push/broadcasts"],
    queryFn: () => apiJson("/api/platform/push/broadcasts"),
  });

  const [config, setConfig] = useState<PushConfig | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [targets, setTargets] = useState<string[]>(["web_staff", "mobile_member", "mobile_staff"]);

  useEffect(() => {
    if (data?.config) setConfig(data.config);
  }, [data?.config]);

  const saveConfig = useMutation({
    mutationFn: () =>
      apiJson("/api/platform/push/config", {
        method: "PATCH",
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/platform/push/config"] });
      toast({ title: t("common.success"), description: t("platformAdmin.push.configSaved") });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: t("common.error"), description: e.message }),
  });

  const sendBroadcast = useMutation({
    mutationFn: () =>
      apiJson("/api/platform/push/broadcast", {
        method: "POST",
        body: JSON.stringify({ title, body, linkUrl: linkUrl || undefined, targets }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/platform/push/broadcasts"] });
      qc.invalidateQueries({ queryKey: ["/api/platform/push/config"] });
      setTitle("");
      setBody("");
      setLinkUrl("");
      toast({ title: t("common.success"), description: t("platformAdmin.push.sent") });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: t("common.error"), description: e.message }),
  });

  const toggleTarget = (id: string) => {
    setTargets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (isLoading || !config) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary opacity-80" />
            <div>
              <p className="text-2xl font-bold">{stats?.webStaffUsers ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t("platformAdmin.push.statWebStaff")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-green-600 opacity-80" />
            <div>
              <p className="text-2xl font-bold">{stats?.mobileMemberDevices ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t("platformAdmin.push.statMemberDevices")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600 opacity-80" />
            <div>
              <p className="text-2xl font-bold">{stats?.mobileStaffDevices ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t("platformAdmin.push.statStaffDevices")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t("platformAdmin.push.configTitle")}
          </CardTitle>
          <CardDescription>{t("platformAdmin.push.configDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{t("platformAdmin.push.enabled")}</p>
              <p className="text-sm text-muted-foreground">{t("platformAdmin.push.enabledHint")}</p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{t("platformAdmin.push.webPopups")}</p>
              <p className="text-sm text-muted-foreground">{t("platformAdmin.push.webPopupsHint")}</p>
            </div>
            <Switch
              checked={config.webPopupsEnabled}
              onCheckedChange={(v) => setConfig({ ...config, webPopupsEnabled: v })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("platformAdmin.push.expoProjectId")}</Label>
              <Input
                value={config.expoProjectId}
                onChange={(e) => setConfig({ ...config, expoProjectId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("platformAdmin.push.expoAccessToken")}</Label>
              <Input
                type="password"
                value={config.expoAccessToken}
                onChange={(e) => setConfig({ ...config, expoAccessToken: e.target.value })}
                placeholder={config.hasAccessToken ? "••••••••" : t("platformAdmin.push.tokenOptional")}
              />
              <p className="text-xs text-muted-foreground">{t("platformAdmin.push.tokenHint")}</p>
            </div>
          </div>
          <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
            {saveConfig.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t("platformAdmin.push.sendTitle")}
          </CardTitle>
          <CardDescription>{t("platformAdmin.push.sendDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("platformAdmin.push.broadcastTitle")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("platformAdmin.push.titlePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("platformAdmin.push.broadcastBody")}</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={t("platformAdmin.push.bodyPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("platformAdmin.push.linkUrl")}</Label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>{t("platformAdmin.push.audience")}</Label>
            <div className="flex flex-wrap gap-4">
              {TARGETS.map((target) => (
                <label key={target.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={targets.includes(target.id)} onCheckedChange={() => toggleTarget(target.id)} />
                  <target.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t(target.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>
          <Button
            onClick={() => sendBroadcast.mutate()}
            disabled={sendBroadcast.isPending || !title.trim() || !body.trim() || targets.length === 0}
          >
            {sendBroadcast.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("platformAdmin.push.sending")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t("platformAdmin.push.sendButton")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("platformAdmin.push.history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("platformAdmin.push.broadcastTitle")}</TableHead>
                  <TableHead>{t("platformAdmin.push.audience")}</TableHead>
                  <TableHead>{t("platformAdmin.push.delivery")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{b.body}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(b.targets || []).map((tg) => (
                          <Badge key={tg} variant="outline" className="text-[10px]">
                            {tg.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.webStaffCount ? `Web: ${b.webStaffCount}` : ""}
                      {b.mobileMemberSent ? ` · Member: ${b.mobileMemberSent}` : ""}
                      {b.mobileStaffSent ? ` · Staff: ${b.mobileStaffSent}` : ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {!broadcasts.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t("platformAdmin.push.noBroadcasts")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
