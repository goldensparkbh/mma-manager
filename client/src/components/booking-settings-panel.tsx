import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { apiJson } from "@/lib/api";
import type { BookingSettings, Member } from "@shared/schema";

export function BookingSettingsPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<BookingSettings>({
    queryKey: ["/api/booking-settings"],
    queryFn: () => apiJson("/api/booking-settings"),
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: () => apiJson("/api/members"),
  });

  const [form, setForm] = useState<Partial<BookingSettings>>({});
  const [portalMemberId, setPortalMemberId] = useState("");
  const [portalPassword, setPortalPassword] = useState("");

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      apiJson("/api/booking-settings", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booking-settings"] });
      toast({ title: t("common.success"), description: t("schedule.saved") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const enablePortal = useMutation({
    mutationFn: () =>
      apiJson(`/api/members/${portalMemberId}/portal-access`, {
        method: "POST",
        body: JSON.stringify({ password: portalPassword }),
      }),
    onSuccess: () => {
      setPortalPassword("");
      toast({ title: t("common.success"), description: t("portal.accessEnabled") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const portalUrl = `${window.location.origin}/portal/${form.publicSlug || tenant?.slug || ""}`;

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("bookings.settingsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("bookings.windowDays")}</Label>
              <Input
                type="number"
                value={form.bookingWindowDays ?? 7}
                onChange={(e) => setForm({ ...form, bookingWindowDays: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("bookings.cancellationHours")}</Label>
              <Input
                type="number"
                value={form.cancellationHours ?? 2}
                onChange={(e) => setForm({ ...form, cancellationHours: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.allowWaitlist !== false}
              onCheckedChange={(v) => setForm({ ...form, allowWaitlist: v })}
            />
            <Label>{t("bookings.allowWaitlist")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.autoPromoteWaitlist !== false}
              onCheckedChange={(v) => setForm({ ...form, autoPromoteWaitlist: v })}
            />
            <Label>{t("bookings.autoPromote")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.portalEnabled !== false}
              onCheckedChange={(v) => setForm({ ...form, portalEnabled: v })}
            />
            <Label>{t("bookings.portalEnabled")}</Label>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {t("common.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {t("portal.memberPortal")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm break-all font-mono">{portalUrl}</div>
          <p className="text-xs text-muted-foreground">{t("portal.urlHint")}</p>

          <div className="space-y-2 border-t pt-4">
            <Label>{t("portal.enableAccess")}</Label>
            <Select value={portalMemberId} onValueChange={setPortalMemberId}>
              <SelectTrigger><SelectValue placeholder={t("bookings.selectMember")} /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.phone})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="password"
              placeholder={t("portal.setPassword")}
              value={portalPassword}
              onChange={(e) => setPortalPassword(e.target.value)}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={!portalMemberId || portalPassword.length < 4 || enablePortal.isPending}
              onClick={() => enablePortal.mutate()}
            >
              {t("portal.enableAccess")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
