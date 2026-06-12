import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Link2, Smartphone } from "lucide-react";
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
              onCheckedChange={(v) =>
                setForm({
                  ...form,
                  portalEnabled: v,
                  appDirectoryEnabled: v ? form.appDirectoryEnabled !== false : false,
                })
              }
            />
            <Label>{t("bookings.portalEnabled")}</Label>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <Label>{t("bookings.allowSelfRegistration")}</Label>
              <p className="text-xs text-muted-foreground mt-1">{t("bookings.allowSelfRegistrationHint")}</p>
            </div>
            <Switch
              checked={form.allowSelfRegistration !== false}
              disabled={form.portalEnabled === false}
              onCheckedChange={(v) => setForm({ ...form, allowSelfRegistration: v })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.tapEnabled !== false}
              onCheckedChange={(v) => setForm({ ...form, tapEnabled: v })}
            />
            <Label>{t("bookings.tapEnabled")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.widgetEnabled !== false}
              onCheckedChange={(v) => setForm({ ...form, widgetEnabled: v })}
            />
            <Label>{t("bookings.widgetEnabled")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.allowRefunds !== false}
              onCheckedChange={(v) => setForm({ ...form, allowRefunds: v })}
            />
            <Label>{t("bookings.allowRefunds")}</Label>
          </div>
          <div className="space-y-2">
            <Label>{t("bookings.refundWindowHours")}</Label>
            <Input
              type="number"
              value={form.refundWindowHours ?? 48}
              onChange={(e) => setForm({ ...form, refundWindowHours: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("bookings.paymentGraceDays")}</Label>
            <Input
              type="number"
              min={0}
              max={14}
              value={form.paymentGraceDays ?? 3}
              onChange={(e) => setForm({ ...form, paymentGraceDays: Number(e.target.value) })}
            />
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
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 p-4 space-y-3">
            <p className="font-semibold flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Smartphone className="h-4 w-4 shrink-0" />
              {t("portal.appDirectoryTitle")}
            </p>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="app-directory" className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t("portal.appDirectoryEnabled")}
              </Label>
              <Switch
                id="app-directory"
                checked={form.appDirectoryEnabled !== false && form.portalEnabled !== false}
                disabled={form.portalEnabled === false}
                onCheckedChange={(v) => setForm({ ...form, appDirectoryEnabled: v })}
              />
            </div>
            <p className="text-blue-800/90 dark:text-blue-200/90 text-xs leading-relaxed">
              {t("portal.appDirectoryHint")}
            </p>
            <ul className="text-xs text-blue-800/80 dark:text-blue-200/80 list-disc ps-4 space-y-1">
              <li>{t("portal.appDirectoryReq1")}</li>
              <li>{t("portal.appDirectoryReq2")}</li>
              <li>{t("portal.appDirectoryReq3")}</li>
            </ul>
            {form.portalEnabled === false ? (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {t("portal.appDirectoryPortalOff")}
              </p>
            ) : null}
          </div>

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

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">{t("portal.branding")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("portal.primaryColor")}</Label>
            <Input
              type="color"
              value={form.portalPrimaryColor || "#004aad"}
              onChange={(e) => setForm({ ...form, portalPrimaryColor: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("portal.welcomeMessage")}</Label>
            <Input
              value={form.portalWelcomeMessage || ""}
              onChange={(e) => setForm({ ...form, portalWelcomeMessage: e.target.value })}
              placeholder={t("portal.welcomePlaceholder")}
            />
          </div>
        </CardContent>
      </Card>

      {form.widgetEnabled !== false && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("embed.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("embed.staffHint")}</p>
            <div className="rounded-lg bg-muted p-3 text-xs font-mono break-all">
              {`<iframe src="${window.location.origin}/embed/${form.publicSlug || tenant?.slug || ""}" width="100%" height="520" frameborder="0" style="border:1px solid #e5e7eb;border-radius:8px;"></iframe>`}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
