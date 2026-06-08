import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";
import type { NotificationTemplate } from "@shared/schema";

const EVENT_LABELS: Record<string, string> = {
  booking_confirmed: "notifications.events.bookingConfirmed",
  booking_cancelled: "notifications.events.bookingCancelled",
  class_reminder: "notifications.events.classReminder",
  subscription_expiring: "notifications.events.subscriptionExpiring",
  payment_received: "notifications.events.paymentReceived",
};

export function NotificationTemplatesPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<NotificationTemplate[]>({
    queryKey: ["/api/notifications/templates"],
    queryFn: () => apiJson("/api/notifications/templates"),
  });

  const [editing, setEditing] = useState<Record<string, Partial<NotificationTemplate>>>({});

  useEffect(() => {
    const map: Record<string, Partial<NotificationTemplate>> = {};
    for (const tpl of templates) {
      map[tpl.id] = { subject: tpl.subject || "", body: tpl.body, isEnabled: tpl.isEnabled };
    }
    setEditing(map);
  }, [templates]);

  const save = useMutation({
    mutationFn: (tpl: NotificationTemplate) =>
      apiJson(`/api/notifications/templates/${tpl.id}`, {
        method: "PATCH",
        body: JSON.stringify(editing[tpl.id]),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/templates"] });
      toast({ title: t("common.success"), description: t("notifications.saved") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("notifications.hint")}</p>
      {templates.map((tpl) => (
        <Card key={tpl.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t(EVENT_LABELS[tpl.eventKey] || tpl.eventKey)}
              </span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing[tpl.id]?.isEnabled !== false}
                  onCheckedChange={(v) =>
                    setEditing((prev) => ({ ...prev, [tpl.id]: { ...prev[tpl.id], isEnabled: v } }))
                  }
                />
                <Label className="text-xs font-normal">{t("notifications.enabled")}</Label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>{t("notifications.subject")}</Label>
              <Input
                value={editing[tpl.id]?.subject || ""}
                onChange={(e) =>
                  setEditing((prev) => ({ ...prev, [tpl.id]: { ...prev[tpl.id], subject: e.target.value } }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("notifications.body")}</Label>
              <Textarea
                rows={4}
                value={editing[tpl.id]?.body || ""}
                onChange={(e) =>
                  setEditing((prev) => ({ ...prev, [tpl.id]: { ...prev[tpl.id], body: e.target.value } }))
                }
              />
            </div>
            <Button size="sm" onClick={() => save.mutate(tpl)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("common.save")}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
