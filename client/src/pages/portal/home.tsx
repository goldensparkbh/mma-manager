import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Calendar, Loader2, LogOut, MapPin, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { usePortalAuth } from "@/context/portal-auth-context";
import { portalApiJson } from "@/lib/portal-api";
import type { Booking, ClassSession } from "@shared/schema";
import { useLocation } from "wouter";

export default function PortalHome() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { member, activeSubscription, clubName, logout, loading, slug } = usePortalAuth();
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

  const cancelBooking = useMutation({
    mutationFn: (id: string) => portalApiJson(`/api/portal/bookings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/bookings"] });
      toast({ title: t("common.success"), description: t("portal.cancelled") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!member) {
    setLocation(`/portal/${slug}`);
    return null;
  }

  const upcomingBookings = bookings.filter(
    (b) => (b.status === "confirmed" || b.status === "waitlist") && b.startsAt && new Date(b.startsAt) > new Date(),
  );

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-bold">{clubName}</p>
          <p className="text-sm text-muted-foreground">{member.name}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation(`/portal/${slug}`); }}>
          <LogOut className="h-4 w-4 me-1" />
          {t("portal.logout")}
        </Button>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
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
          <TabsList className="w-full">
            <TabsTrigger value="classes" className="flex-1">{t("portal.availableClasses")}</TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1">{t("portal.myBookings")}</TabsTrigger>
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
        </Tabs>
      </main>
    </div>
  );
}
