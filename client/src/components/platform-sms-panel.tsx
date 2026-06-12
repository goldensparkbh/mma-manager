import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import { Loader2, MessageSquare } from "lucide-react";

type SmsConfig = {
  enabled: boolean;
  provider: "twilio" | "console";
  accountSid: string;
  authToken: string;
  fromNumber: string;
  otpMessageTemplate: string;
  hasAuthToken?: boolean;
};

export function PlatformSmsPanel() {
  const { t: tr } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SmsConfig>({
    queryKey: ["/api/platform/sms/config"],
    queryFn: () => apiJson("/api/platform/sms/config"),
  });

  const [config, setConfig] = useState<SmsConfig | null>(null);

  useEffect(() => {
    if (data) setConfig(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      apiJson("/api/platform/sms/config", {
        method: "PATCH",
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/platform/sms/config"] });
      toast({ title: tr("common.success"), description: tr("platformAdmin.sms.configSaved") });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: tr("common.error"), description: e.message }),
  });

  if (isLoading || !config) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {tr("platformAdmin.sms.title")}
        </CardTitle>
        <CardDescription>{tr("platformAdmin.sms.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">{tr("platformAdmin.sms.enabled")}</p>
            <p className="text-sm text-muted-foreground">{tr("platformAdmin.sms.enabledHint")}</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
        </div>

        <div className="space-y-2">
          <Label>{tr("platformAdmin.sms.provider")}</Label>
          <Select
            value={config.provider}
            onValueChange={(v) => setConfig({ ...config, provider: v as SmsConfig["provider"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="console">{tr("platformAdmin.sms.providerConsole")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{tr("platformAdmin.sms.providerHint")}</p>
        </div>

        {config.provider === "twilio" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{tr("platformAdmin.sms.accountSid")}</Label>
              <Input
                value={config.accountSid}
                onChange={(e) => setConfig({ ...config, accountSid: e.target.value })}
                placeholder="ACxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>{tr("platformAdmin.sms.fromNumber")}</Label>
              <Input
                value={config.fromNumber}
                onChange={(e) => setConfig({ ...config, fromNumber: e.target.value })}
                placeholder="+973..."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{tr("platformAdmin.sms.authToken")}</Label>
              <Input
                type="password"
                value={config.authToken}
                onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                placeholder={config.hasAuthToken ? "••••••••" : tr("platformAdmin.sms.tokenOptional")}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>{tr("platformAdmin.sms.otpTemplate")}</Label>
          <Textarea
            value={config.otpMessageTemplate}
            onChange={(e) => setConfig({ ...config, otpMessageTemplate: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">{tr("platformAdmin.sms.otpTemplateHint")}</p>
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? tr("common.saving") : tr("common.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
