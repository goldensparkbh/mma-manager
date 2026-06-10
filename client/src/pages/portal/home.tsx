import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Award, Calendar, CheckCircle2, CreditCard, Loader2, LogOut, MapPin, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { usePortalAuth } from "@/context/portal-auth-context";
import { portalApiJson, setPortalToken } from "@/lib/portal-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Booking, ClassSession, MemberPayment, SubscriptionPackage } from "@shared/schema";
import { useLocation } from "wouter";
import { PortalInstallBanner } from "@/components/portal-install-banner";
import { PortalQrCard } from "@/components/portal-qr-card";

export default function PortalHome() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { member, activeSubscription, clubName, logout, loading, slug, refresh } = usePortalAuth();

  const { data: portalInfo } = useQuery<{ logoUrl?: string; primaryColor?: string; welcomeMessage?: string }>({
    queryKey: ["/api/portal/info", slug],
    queryFn: () => fetch(`/api/portal/${slug}/info`).then((r) => r.json()),
    enabled: !!slug,
  });

  const { data: familyMembers = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/portal/family-members"],
    queryFn: () => portalApiJson("/api/portal/family-members"),
    enabled: !!member,
  });
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const locale = language === "ar" ? ar : enUS;

  const from = new Date().toISOString();
  const to = addDays(new Date(), 14).toISOString();

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<ClassSession[]>({
    queryKey: ["/api/portal/classes", from, to],
    queryFn: () =>
      portalApiJson(`/api/portal/classes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    enabled: !!member,
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/portal/bookings"],
    queryFn: () => portalApiJson("/api/portal/bookings"),
    enabled: !!member,
  });

  const { data: packages = [], isLoading: loadingPackages } = useQuery<SubscriptionPackage[]>({
    queryKey: ["/api/portal/packages"],
    queryFn: () => portalApiJson("/api/portal/packages"),
    enabled: !!member,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery<MemberPayment[]>({
    queryKey: ["/api/portal/payments"],
    queryFn: () => portalApiJson("/api/portal/payments"),
    enabled: !!member,
  });

  const { data: camps = [], isLoading: loadingCamps } = useQuery<
    { id: string; title: string; startDate: string; price?: number; capacity?: number }[]
  >({
    queryKey: ["/api/portal/camps"],
    queryFn: () => portalApiJson("/api/portal/camps"),
    enabled: !!member,
  });

  const { data: progression } = useQuery<{
    memberBelts: Array<{ id: string; beltName?: string | null; beltColor?: string | null; stripes?: number; awardedAt?: string }>;
  }>({
    queryKey: ["/api/portal/progression"],
    queryFn: () => portalApiJson("/api/portal/progression"),
    enabled: !!member,
  });

  const { data: attendance = [], isLoading: loadingAttendance } = useQuery<
    Array<{ id: string; date: string; checkIn?: string | null }>
  >({
    queryKey: ["/api/portal/attendance"],
    queryFn: () => portalApiJson("/api/portal/attendance"),
    enabled: !!member,
  });

  const registerCamp = useMutation({
    mutationFn: (campId: string) =>
      portalApiJson(`/api/portal/camps/${campId}/register`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      toast({ title: t("common.success"), description: t("camps.registered") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const bookedSessionIds = useMemo(
    () => new Set(bookings.filter((b) => b.status === "confirmed" || b.status === "waitlist").map((b) => b.sessionId)),
    [bookings],
  );

  const bookSession = useMutation({
    mutationFn: (sessionId: string) =>
      portalApiJson("/api/portal/bookings", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/bookings"] });
      toast({ title: t("common.success"), description: t("portal.booked") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const checkout = useMutation({
    mutationFn: (packageId: string) =>
      portalApiJson<{ url: string }>("/api/portal/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ packageId }),
      }),
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const cancelBooking = useMutation({
    mutationFn: (id: string) => portalApiJson(`/api/portal/bookings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/bookings"] });
      toast({ title: t("common.success"), description: t("portal.cancelled") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const switchMember = useMutation({
    mutationFn: (memberId: string) =>
      portalApiJson<{ token: string }>("/api/portal/switch-member", {
        method: "POST",
        body: JSON.stringify({ memberId }),
      }),
    onSuccess: async (data) => {
      setPortalToken(data.token);
      await refresh();
      queryClient.invalidateQueries();
    },
  });

  useEffect(() => {
    if (!loading && !member) {
      setLocation(`/portal/${slug}`);
    }
  }, [loading, member, slug, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!member) {
    return null;
  }

  const upcomingBookings = bookings.filter(
    (b) => (b.status === "confirmed" || b.status === "waitlist") && b.startsAt && new Date(b.startsAt) > new Date(),
  );

  const accent = portalInfo?.primaryColor || "#3b82f6";

  return (
    <div className="min-h-screen bg-muted/20" style={{ "--portal-accent": accent } as React.CSSProperties}>
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between" style={{ borderTop: `3px solid ${accent}` }}>
        <div className="flex items-center gap-3">
          {portalInfo?.logoUrl && <img src={portalInfo.logoUrl} alt="" className="h-10 w-10 object-contain rounded" />}
          <div>
            <p className="font-bold">{clubName}</p>
            <p className="text-sm text-muted-foreground">{member.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation(`/portal/${slug}`); }}>
          <LogOut className="h-4 w-4 me-1" />
          {t("portal.logout")}
        </Button>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <PortalInstallBanner />
        {portalInfo?.welcomeMessage && (
          <p className="text-sm text-center text-muted-foreground">{portalInfo.welcomeMessage}</p>
        )}
        {familyMembers.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("portal.switchMember")}</p>
            <Select value={member.id} onValueChange={(v) => switchMember.mutate(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {familyMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Card>
          <CardContent className="pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("portal.subscription")}</span>
              <Badge variant={activeSubscription ? "default" : "destructive"}>
                {activeSubscription ? activeSubscription.planName : t("portal.noSubscription")}
              </Badge>
            </div>
            {activeSubscription?.packageType === "sessions" && (
              <p className="text-muted-foreground">
                {t("portal.sessionsLeft")}: {activeSubscription.sessionsRemaining ?? 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="classes">
          <TabsList className="w-full flex-wrap h-auto">
            <TabsTrigger value="classes" className="flex-1">{t("portal.availableClasses")}</TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1">{t("portal.myBookings")}</TabsTrigger>
            <TabsTrigger value="camps" className="flex-1">{t("camps.title")}</TabsTrigger>
            <TabsTrigger value="payments" className="flex-1">{t("portal.payments")}</TabsTrigger>
            <TabsTrigger value="profile" className="flex-1">{t("portal.profile")}</TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-3 mt-4">
            {loadingSessions ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("portal.noClasses")}</p>
            ) : (
              sessions.map((session) => {
                const isBooked = bookedSessionIds.has(session.id);
                const full = (session.bookedCount ?? 0) >= session.capacity;
                return (
                  <Card key={session.id}>
                    <CardHeader className="pb-2 p-4">
                      <CardTitle className="text-base">{session.name}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(session.startsAt), "EEE d MMM · HH:mm", { locale })}
                      </p>
                      {session.coachName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> {session.coachName}
                        </p>
                      )}
                      {session.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {session.location}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex items-center justify-between">
                      <Badge variant="secondary">
                        {session.bookedCount ?? 0}/{session.capacity}
                      </Badge>
                      {isBooked ? (
                        <Badge>{t("portal.booked")}</Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!activeSubscription || bookSession.isPending}
                          onClick={() => bookSession.mutate(session.id)}
                        >
                          {full ? t("portal.joinWaitlist") : t("portal.book")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-3 mt-4">
            {loadingBookings ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : upcomingBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("portal.noBookings")}</p>
            ) : (
              upcomingBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{booking.sessionName}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.startsAt && format(new Date(booking.startsAt), "EEE d MMM · HH:mm", { locale })}
                      </p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {t(`portal.status.${booking.status}`)}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cancelBooking.isPending}
                      onClick={() => cancelBooking.mutate(booking.id)}
                    >
                      {t("portal.cancel")}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="camps" className="space-y-3 mt-4">
            {loadingCamps ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : camps.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("camps.empty")}</p>
            ) : (
              camps.map((camp) => (
                <Card key={camp.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{camp.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(camp.startDate), "EEE d MMM · HH:mm", { locale })}
                      </p>
                      {camp.price != null && (
                        <p className="text-xs text-muted-foreground mt-1">{camp.price} {t("embed.currency")}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      disabled={registerCamp.isPending}
                      onClick={() => registerCamp.mutate(camp.id)}
                    >
                      {t("camps.register")}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-3 mt-4">
            <Card>
              <CardHeader className="pb-2 p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {t("portal.renewTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {loadingPackages ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("portal.noPackages")}</p>
                ) : (
                  packages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{pkg.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pkg.packageType === "sessions"
                            ? `${pkg.sessionCount} ${t("portal.sessions")}`
                            : `${pkg.duration} ${t("portal.days")}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={checkout.isPending}
                        onClick={() => checkout.mutate(pkg.id)}
                      >
                        {pkg.price} {t("embed.currency")}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {loadingPayments ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : payments.length > 0 && (
              <Card>
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-base">{t("portal.paymentHistory")}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {payments.slice(0, 10).map((payment) => (
                    <div key={payment.id} className="flex justify-between text-sm">
                      <span>{payment.packageName}</span>
                      <Badge variant={payment.status === "captured" ? "default" : "secondary"}>
                        {payment.amount} {payment.currency}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-3 mt-4">
            <PortalQrCard />
            <Card>
              <CardHeader className="pb-2 p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  {t("portal.progression")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {!progression?.memberBelts?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("portal.noBelts")}</p>
                ) : (
                  progression.memberBelts.slice(0, 8).map((belt) => (
                    <div key={belt.id} className="flex items-center gap-3 border-b pb-2 last:border-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: belt.beltColor || accent }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{belt.beltName || "—"}</p>
                        {belt.awardedAt && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(belt.awardedAt), "d MMM yyyy", { locale })}
                          </p>
                        )}
                      </div>
                      {(belt.stripes ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {belt.stripes} {t("portal.stripes")}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("portal.attendance")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {loadingAttendance ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : attendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("portal.noAttendance")}</p>
                ) : (
                  attendance.slice(0, 12).map((row) => (
                    <div key={row.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                      <span>{row.date}</span>
                      <span className="text-muted-foreground">
                        {row.checkIn ? format(new Date(row.checkIn), "HH:mm", { locale }) : "—"}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
