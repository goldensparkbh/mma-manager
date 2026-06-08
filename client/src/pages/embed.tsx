import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Calendar, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";
import { useRoute } from "wouter";
import type { ClassSession, SubscriptionPackage } from "@shared/schema";

async function publicJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || "Request failed");
  }
  return res.json();
}

export default function EmbedWidget() {
  const { t, language } = useLanguage();
  const [, params] = useRoute("/embed/:slug");
  const slug = params?.slug || "";
  const locale = language === "ar" ? ar : enUS;

  const from = new Date().toISOString();
  const to = addDays(new Date(), 14).toISOString();

  const { data: info, isLoading: loadingInfo, error: infoError } = useQuery({
    queryKey: ["/api/public", slug, "info"],
    queryFn: () => publicJson<{ name: string; widgetEnabled: boolean; portalEnabled: boolean }>(`/api/public/${slug}/info`),
    enabled: !!slug,
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<ClassSession[]>({
    queryKey: ["/api/public", slug, "schedule", from, to],
    queryFn: () =>
      publicJson(`/api/public/${slug}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    enabled: !!slug && !!info?.widgetEnabled,
  });

  const { data: packages = [] } = useQuery<SubscriptionPackage[]>({
    queryKey: ["/api/public", slug, "packages"],
    queryFn: () => publicJson(`/api/public/${slug}/packages`),
    enabled: !!slug && !!info?.widgetEnabled,
  });

  const portalUrl = useMemo(() => `${window.location.origin}/portal/${slug}`, [slug]);

  if (!slug) {
    return <p className="p-4 text-muted-foreground text-center">{t("embed.invalid")}</p>;
  }

  if (loadingInfo) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (infoError || !info) {
    return <p className="p-4 text-muted-foreground text-center">{t("embed.notFound")}</p>;
  }

  if (!info.widgetEnabled) {
    return <p className="p-4 text-muted-foreground text-center">{t("embed.disabled")}</p>;
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-lg mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold">{info.name}</h1>
        <p className="text-sm text-muted-foreground">{t("embed.subtitle")}</p>
      </div>

      {packages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("embed.packages")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {packages.slice(0, 4).map((pkg) => (
              <div key={pkg.id} className="flex justify-between text-sm">
                <span>{pkg.name}</span>
                <Badge variant="secondary">{pkg.price} {t("embed.currency")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("embed.upcoming")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingSessions ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("portal.noClasses")}</p>
          ) : (
            sessions.slice(0, 8).map((session) => (
              <div key={session.id} className="text-sm border-b pb-2 last:border-0">
                <p className="font-medium">{session.name}</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(session.startsAt), "EEE d MMM · HH:mm", { locale })}
                </p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {session.bookedCount ?? 0}/{session.capacity}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {info.portalEnabled && (
        <Button className="w-full" asChild>
          <a href={portalUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 me-2" />
            {t("embed.bookNow")}
          </a>
        </Button>
      )}
    </div>
  );
}
