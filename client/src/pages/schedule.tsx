import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { safeFormat } from "@/lib/formatDate";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";
import { apiJson, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ClassSession, ClassTemplate, Coach, RecurrenceSlot, SubscriptionPackage } from "@shared/schema";
import { SessionRosterDialog } from "@/components/session-roster-dialog";
import { BookingSettingsPanel } from "@/components/booking-settings-panel";
import { NotificationTemplatesPanel } from "@/components/notification-templates-panel";
import { MemberPaymentsPanel } from "@/components/member-payments-panel";
import { FamiliesPanel } from "@/components/families-panel";
import { BranchSelect } from "@/components/branch-select";
import {
  CLASS_CALENDAR_COLOR,
  getSessionsForDay,
  MonthlyCalendar,
} from "@/components/schedule/monthly-calendar";

const WEEK_STARTS_ON = 6 as const; // Saturday
const ORDERED_DAYS = [6, 0, 1, 2, 3, 4, 5] as const;
const COLORS = ["#004aad", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

const emptyTemplate = (): Partial<ClassTemplate> => ({
  name: "",
  description: "",
  coachId: "",
  location: "",
  capacity: 20,
  durationMinutes: 60,
  color: "#004aad",
  recurrence: [],
  isActive: true,
});

const emptyCoach = (): Partial<Coach> => ({
  name: "",
  phone: "",
  email: "",
  bio: "",
  isActive: true,
});

export default function SchedulePage() {
  const { t, language, dir } = useLanguage();
  const { toast } = useToast();
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const isCoach = user?.role === "coach";
  const canManage = hasPermission(PERMISSIONS.CLASSES_MANAGE) && !isCoach;
  const locale = language === "ar" ? ar : enUS;

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON }),
  );
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => new Date());
  const [templateDialog, setTemplateDialog] = useState(false);
  const [coachDialog, setCoachDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ClassTemplate> | null>(null);
  const [editingCoach, setEditingCoach] = useState<Partial<Coach> | null>(null);
  const [rosterSession, setRosterSession] = useState<ClassSession | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const canBook = hasPermission(PERMISSIONS.BOOKINGS_MANAGE) || canManage || isCoach;

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON });
  const fromIso = weekStart.toISOString();
  const toIso = weekEnd.toISOString();
  const monthFromIso = startOfMonth(calendarMonth).toISOString();
  const monthToIso = endOfMonth(calendarMonth).toISOString();

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<ClassSession[]>({
    queryKey: ["/api/classes/sessions", fromIso, toIso, branchFilter],
    queryFn: () => {
      const branchQ = branchFilter ? `&branchId=${encodeURIComponent(branchFilter)}` : "";
      return apiJson(
        `/api/classes/sessions?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}${branchQ}`,
      );
    },
  });

  const { data: monthSessions = [], isLoading: loadingMonthSessions } = useQuery<ClassSession[]>({
    queryKey: ["/api/classes/sessions", monthFromIso, monthToIso, branchFilter, "month"],
    queryFn: () => {
      const branchQ = branchFilter ? `&branchId=${encodeURIComponent(branchFilter)}` : "";
      return apiJson(
        `/api/classes/sessions?from=${encodeURIComponent(monthFromIso)}&to=${encodeURIComponent(monthToIso)}${branchQ}`,
      );
    },
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<ClassTemplate[]>({
    queryKey: ["/api/classes/templates"],
    queryFn: () => apiJson("/api/classes/templates"),
  });

  const { data: coaches = [], isLoading: loadingCoaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
    queryFn: () => apiJson("/api/coaches"),
  });

  const { data: packages = [] } = useQuery<SubscriptionPackage[]>({
    queryKey: ["/api/packages"],
    queryFn: () => apiJson("/api/packages"),
    enabled: canManage,
  });

  const { data: staffUsers = [] } = useQuery<{ id: string; displayName: string; email: string }[]>({
    queryKey: ["/api/users"],
    queryFn: () => apiJson("/api/users"),
    enabled: canManage,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/classes/sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/classes/templates"] });
    queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
  };

  const generateSessions = useMutation({
    mutationFn: () =>
      apiJson<{ created: number }>("/api/classes/sessions/generate", {
        method: "POST",
        body: JSON.stringify({ days: 28 }),
      }),
    onSuccess: (data) => {
      invalidate();
      toast({
        title: t("common.success"),
        description: t("schedule.generateSuccess").replace("{count}", String(data.created)),
      });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const saveTemplate = useMutation({
    mutationFn: async (payload: Partial<ClassTemplate>) => {
      if (payload.id) {
        return apiJson(`/api/classes/templates/${payload.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      return apiJson("/api/classes/templates", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      invalidate();
      setTemplateDialog(false);
      setEditingTemplate(null);
      toast({ title: t("common.success"), description: t("schedule.saved") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/classes/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast({ title: t("common.success"), description: t("schedule.deleted") });
    },
  });

  const saveCoach = useMutation({
    mutationFn: async (payload: Partial<Coach>) => {
      if (payload.id) {
        return apiJson(`/api/coaches/${payload.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      return apiJson("/api/coaches", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      invalidate();
      setCoachDialog(false);
      setEditingCoach(null);
      toast({ title: t("common.success"), description: t("schedule.saved") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const deleteCoach = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/coaches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast({ title: t("common.success"), description: t("schedule.deleted") });
    },
  });

  const updateSession = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClassSession["status"] }) =>
      apiJson(`/api/classes/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: t("common.success"), description: t("schedule.saved") });
    },
  });

  const sessionsByDay = useMemo(() => {
    const map: Record<number, ClassSession[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const session of sessions) {
      const day = new Date(session.startsAt).getDay();
      map[day].push(session);
    }
    for (const day of ORDERED_DAYS) {
      map[day].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return map;
  }, [sessions]);

  const weekLabel = `${format(weekStart, "d MMM", { locale })} – ${format(weekEnd, "d MMM yyyy", { locale })}`;
  const selectedDaySessions = useMemo(
    () => getSessionsForDay(monthSessions, calendarSelectedDate),
    [monthSessions, calendarSelectedDate],
  );

  const openNewTemplate = () => {
    setEditingTemplate(emptyTemplate());
    setTemplateDialog(true);
  };

  const openEditTemplate = (template: ClassTemplate) => {
    setEditingTemplate({ ...template, recurrence: [...(template.recurrence || [])] });
    setTemplateDialog(true);
  };

  const openNewCoach = () => {
    setEditingCoach(emptyCoach());
    setCoachDialog(true);
  };

  const openEditCoach = (coach: Coach) => {
    setEditingCoach({ ...coach });
    setCoachDialog(true);
  };

  const addRecurrenceSlot = () => {
    if (!editingTemplate) return;
    const recurrence = [...(editingTemplate.recurrence || []), { day: 1, startTime: "18:00" }];
    setEditingTemplate({ ...editingTemplate, recurrence });
  };

  const updateRecurrenceSlot = (index: number, updates: Partial<RecurrenceSlot>) => {
    if (!editingTemplate) return;
    const recurrence = [...(editingTemplate.recurrence || [])];
    recurrence[index] = { ...recurrence[index], ...updates };
    setEditingTemplate({ ...editingTemplate, recurrence });
  };

  const removeRecurrenceSlot = (index: number) => {
    if (!editingTemplate) return;
    const recurrence = (editingTemplate.recurrence || []).filter((_, i) => i !== index);
    setEditingTemplate({ ...editingTemplate, recurrence });
  };

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t("schedule.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("schedule.subtitle")}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => generateSessions.mutate()}
              disabled={generateSessions.isPending}
            >
              {generateSessions.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <RefreshCw className="h-4 w-4 me-2" />
              )}
              {t("schedule.generateSessions")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <BranchSelect
          allowAll
          label={t("branches.title")}
          value={branchFilter}
          onChange={setBranchFilter}
          className="w-full sm:w-56"
        />
      </div>

      <Tabs defaultValue="week">
        <TabsList className="w-full h-auto flex-wrap justify-start">
          <TabsTrigger value="week">{t("schedule.weekView")}</TabsTrigger>
          <TabsTrigger value="month">{t("schedule.monthView")}</TabsTrigger>
          {!isCoach && (
            <>
              <TabsTrigger value="templates">{t("schedule.templates")}</TabsTrigger>
              <TabsTrigger value="coaches">{t("schedule.coaches")}</TabsTrigger>
              <TabsTrigger value="settings">{t("bookings.settings")}</TabsTrigger>
              <TabsTrigger value="notifications">{t("notifications.title")}</TabsTrigger>
              <TabsTrigger value="payments">{t("payments.title")}</TabsTrigger>
              <TabsTrigger value="families">{t("families.title")}</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="week" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
              {dir === "rtl" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <span className="font-semibold text-sm sm:text-base">{weekLabel}</span>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
              {dir === "rtl" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          {loadingSessions ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {ORDERED_DAYS.map((day) => {
                const dayOffset = (day - WEEK_STARTS_ON + 7) % 7;
                const dayDate = addDays(weekStart, dayOffset);
                const daySessions = sessionsByDay[day];

                return (
                  <Card key={day} className="min-h-[180px]">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm font-semibold">
                        {t(`schedule.days.${day}`)}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {format(dayDate, "d MMM", { locale })}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {daySessions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("schedule.noSessions")}</p>
                      ) : (
                        daySessions.map((session) => (
                          <div
                            key={session.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setRosterSession(session)}
                            onKeyDown={(e) => e.key === "Enter" && setRosterSession(session)}
                            className={cn(
                              "w-full text-start rounded-lg border p-2 text-xs space-y-1 transition-colors hover:bg-muted/50 cursor-pointer",
                              session.status === "cancelled" && "opacity-50 line-through",
                            )}
                            style={{ borderInlineStartWidth: 3, borderInlineStartColor: session.status === "scheduled" ? "#004aad" : undefined }}
                          >
                            <p className="font-semibold leading-tight">{session.name}</p>
                            <p className="text-muted-foreground">
                              {safeFormat(session.startsAt, "HH:mm")} – {safeFormat(session.endsAt, "HH:mm")}
                            </p>
                            {session.coachName && (
                              <p className="text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> {session.coachName}
                              </p>
                            )}
                            <div className="flex items-center justify-between gap-1 pt-1">
                              <Badge variant="secondary" className="text-[10px]">
                                {session.bookedCount ?? 0}/{session.capacity}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {t(`schedule.status.${session.status}`)}
                              </Badge>
                            </div>
                            {canManage && session.status === "scheduled" && (
                              <div className="flex gap-1 pt-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateSession.mutate({ id: session.id, status: "cancelled" });
                                  }}
                                >
                                  {t("schedule.cancelSession")}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          {loadingMonthSessions ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardContent className="p-4">
                  <MonthlyCalendar
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selectedDate={calendarSelectedDate}
                    onSelectDate={setCalendarSelectedDate}
                    sessions={monthSessions}
                    showInternalEvents={false}
                    onClassClick={setRosterSession}
                    language={language}
                    dir={dir}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base">
                    {format(calendarSelectedDate, "EEEE, d MMM", { locale })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {selectedDaySessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">{t("schedule.noSessionsDay")}</p>
                  ) : (
                    selectedDaySessions.map((session) => (
                      <div
                        key={session.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setRosterSession(session)}
                        onKeyDown={(e) => e.key === "Enter" && setRosterSession(session)}
                        className={cn(
                          "w-full text-start rounded-lg border p-3 text-sm space-y-1 transition-colors hover:bg-muted/50 cursor-pointer",
                          session.status === "cancelled" && "opacity-50 line-through",
                        )}
                        style={{
                          borderInlineStartWidth: 3,
                          borderInlineStartColor:
                            session.status === "scheduled" ? CLASS_CALENDAR_COLOR : "#94a3b8",
                        }}
                      >
                        <p className="font-semibold">{session.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {safeFormat(session.startsAt, "HH:mm")} – {safeFormat(session.endsAt, "HH:mm")}
                        </p>
                        {session.coachName && (
                          <p className="text-muted-foreground text-xs flex items-center gap-1">
                            <User className="h-3 w-3" /> {session.coachName}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-1 pt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {session.bookedCount ?? 0}/{session.capacity}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {t(`schedule.status.${session.status}`)}
                          </Badge>
                        </div>
                        {canManage && session.status === "scheduled" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 mt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSession.mutate({ id: session.id, status: "cancelled" });
                            }}
                          >
                            {t("schedule.cancelSession")}
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <BookingSettingsPanel />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationTemplatesPanel />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <MemberPaymentsPanel />
        </TabsContent>

        <TabsContent value="families" className="space-y-4">
          <FamiliesPanel />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {canManage && (
            <Button onClick={openNewTemplate}>
              <Plus className="h-4 w-4 me-2" />
              {t("schedule.newTemplate")}
            </Button>
          )}
          {loadingTemplates ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          ) : templates.length === 0 ? (
            <p className="text-muted-foreground">{t("schedule.noTemplates")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: template.color || "#004aad" }}
                        />
                        {template.name}
                      </CardTitle>
                      {!template.isActive && (
                        <Badge variant="secondary">{t("common.inactive") || "Inactive"}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {template.coachName && (
                      <p className="text-muted-foreground">{t("schedule.coach")}: {template.coachName}</p>
                    )}
                    {template.location && (
                      <p className="text-muted-foreground">{template.location}</p>
                    )}
                    <p className="text-muted-foreground">
                      {template.capacity} · {template.durationMinutes} min
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(template.recurrence || []).map((slot, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {t(`schedule.days.${slot.day}`)} {slot.startTime}
                        </Badge>
                      ))}
                    </div>
                    {canManage && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => openEditTemplate(template)}>
                          {t("common.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(t("schedule.confirmDeleteTemplate"))) {
                              deleteTemplate.mutate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coaches" className="space-y-4">
          {canManage && (
            <Button onClick={openNewCoach}>
              <Plus className="h-4 w-4 me-2" />
              {t("schedule.newCoach")}
            </Button>
          )}
          {loadingCoaches ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          ) : coaches.length === 0 ? (
            <p className="text-muted-foreground">{t("schedule.noCoaches")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {coaches.map((coach) => (
                <Card key={coach.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{coach.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    {coach.phone && <p>{coach.phone}</p>}
                    {coach.email && <p>{coach.email}</p>}
                    {canManage && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => openEditCoach(coach)}>
                          {t("common.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(t("schedule.confirmDeleteCoach"))) {
                              deleteCoach.mutate(coach.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? t("schedule.editTemplate") : t("schedule.newTemplate")}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("schedule.templateName")}</Label>
                <Input
                  value={editingTemplate.name || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("schedule.description")}</Label>
                <Textarea
                  value={editingTemplate.description || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("schedule.coach")}</Label>
                  <Select
                    value={editingTemplate.coachId || "none"}
                    onValueChange={(v) =>
                      setEditingTemplate({ ...editingTemplate, coachId: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {coaches.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("schedule.location")}</Label>
                  <Input
                    value={editingTemplate.location || ""}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, location: e.target.value })}
                  />
                </div>
              </div>
              <BranchSelect
                label={t("branches.title")}
                value={editingTemplate.branchId}
                onChange={(v) => setEditingTemplate({ ...editingTemplate, branchId: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("schedule.capacity")}</Label>
                  <Input
                    type="number"
                    value={editingTemplate.capacity ?? 20}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, capacity: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("schedule.duration")}</Label>
                  <Input
                    type="number"
                    value={editingTemplate.durationMinutes ?? 60}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, durationMinutes: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("schedule.color")}</Label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "h-8 w-8 rounded-full border-2",
                        editingTemplate.color === color ? "border-foreground" : "border-transparent",
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingTemplate({ ...editingTemplate, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("schedule.recurrence")}</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addRecurrenceSlot}>
                    <Plus className="h-3 w-3 me-1" />
                    {t("schedule.addSlot")}
                  </Button>
                </div>
                {(editingTemplate.recurrence || []).map((slot, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">{t("schedule.day")}</Label>
                      <Select
                        value={String(slot.day)}
                        onValueChange={(v) => updateRecurrenceSlot(index, { day: Number(v) })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ORDERED_DAYS.map((d) => (
                            <SelectItem key={d} value={String(d)}>{t(`schedule.days.${d}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">{t("schedule.startTime")}</Label>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateRecurrenceSlot(index, { startTime: e.target.value })}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRecurrenceSlot(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              {packages.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("schedule.allowedPackages")}</Label>
                  <p className="text-xs text-muted-foreground">{t("schedule.allowedPackagesHint")}</p>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {packages.map((pkg) => {
                      const selected = (editingTemplate.allowedPackageIds || []).includes(pkg.id);
                      return (
                        <label key={pkg.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const current = editingTemplate.allowedPackageIds || [];
                              const next = selected
                                ? current.filter((id) => id !== pkg.id)
                                : [...current, pkg.id];
                              setEditingTemplate({ ...editingTemplate, allowedPackageIds: next });
                            }}
                          />
                          {pkg.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingTemplate.deductSession === true}
                  onCheckedChange={(v) => setEditingTemplate({ ...editingTemplate, deductSession: v })}
                />
                <Label>{t("schedule.deductSession")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingTemplate.isActive !== false}
                  onCheckedChange={(v) => setEditingTemplate({ ...editingTemplate, isActive: v })}
                />
                <Label>{t("schedule.active")}</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={!editingTemplate?.name || saveTemplate.isPending}
              onClick={() => editingTemplate && saveTemplate.mutate(editingTemplate)}
            >
              {saveTemplate.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={coachDialog} onOpenChange={setCoachDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCoach?.id ? t("schedule.editCoach") : t("schedule.newCoach")}
            </DialogTitle>
          </DialogHeader>
          {editingCoach && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("schedule.coachName")}</Label>
                <Input
                  value={editingCoach.name || ""}
                  onChange={(e) => setEditingCoach({ ...editingCoach, name: e.target.value })}
                />
              </div>
              {staffUsers.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("schedule.linkStaffUser")}</Label>
                  <Select
                    value={editingCoach.userId || "none"}
                    onValueChange={(v) =>
                      setEditingCoach({ ...editingCoach, userId: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger><SelectValue placeholder={t("schedule.selectStaffUser")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {staffUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.displayName || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>{t("schedule.phone")}</Label>
                <Input
                  value={editingCoach.phone || ""}
                  onChange={(e) => setEditingCoach({ ...editingCoach, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("schedule.email")}</Label>
                <Input
                  type="email"
                  value={editingCoach.email || ""}
                  onChange={(e) => setEditingCoach({ ...editingCoach, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("schedule.bio")}</Label>
                <Textarea
                  value={editingCoach.bio || ""}
                  onChange={(e) => setEditingCoach({ ...editingCoach, bio: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoachDialog(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={!editingCoach?.name || saveCoach.isPending}
              onClick={() => editingCoach && saveCoach.mutate(editingCoach)}
            >
              {saveCoach.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SessionRosterDialog
        session={rosterSession}
        open={!!rosterSession}
        onOpenChange={(open) => !open && setRosterSession(null)}
        canManage={canBook}
      />
    </div>
  );
}
