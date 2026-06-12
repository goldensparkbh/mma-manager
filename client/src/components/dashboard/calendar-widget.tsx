import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, Filter, Plus, Trash2 } from "lucide-react";
import type { ClassSession, Event, InsertEvent } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { apiJson } from "@/lib/api";
import { useLanguage } from "@/context/language-context";
import { safeFormat } from "@/lib/formatDate";
import { cn } from "@/lib/utils";
import {
  CLASS_CALENDAR_COLOR,
  getInternalEventsForDay,
  getSessionsForDay,
  MonthlyCalendar,
} from "@/components/schedule/monthly-calendar";

const INTERNAL_COLORS = ["#8b5cf6", "#ef4444", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

export function CalendarWidget() {
  const { t, language, dir } = useLanguage();
  const { toast } = useToast();
  const locale = language === "ar" ? ar : enUS;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [showClasses, setShowClasses] = useState(true);
  const [showInternalEvents, setShowInternalEvents] = useState(true);
  const [selectedColors, setSelectedColors] = useState<string[]>(INTERNAL_COLORS);
  const [newEvent, setNewEvent] = useState<Partial<InsertEvent>>({
    title: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    isAllDay: true,
    color: INTERNAL_COLORS[0],
  });

  const monthFrom = startOfMonth(currentMonth).toISOString();
  const monthTo = endOfMonth(currentMonth).toISOString();

  const { data: sessions = [] } = useQuery<ClassSession[]>({
    queryKey: ["/api/classes/sessions", monthFrom, monthTo],
    queryFn: () =>
      apiJson(
        `/api/classes/sessions?from=${encodeURIComponent(monthFrom)}&to=${encodeURIComponent(monthTo)}`,
      ),
  });

  const { data: internalEvents = [] } = useQuery<Event[]>({
    queryKey: ["/api/events", "internal"],
    queryFn: () => apiJson("/api/events?scope=internal"),
  });

  const filteredInternalEvents = useMemo(
    () =>
      internalEvents.filter((event) =>
        event.color ? selectedColors.includes(event.color) : selectedColors.includes(INTERNAL_COLORS[0]),
      ),
    [internalEvents, selectedColors],
  );

  const createEventMutation = useMutation({
    mutationFn: async (event: InsertEvent) => {
      const res = await apiRequest("POST", "/api/events", event);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: t("common.success"), description: t("events.created") });
      setIsAddEventOpen(false);
      setNewEvent({
        title: "",
        description: "",
        startDate: format(selectedDate, "yyyy-MM-dd"),
        isAllDay: true,
        color: INTERNAL_COLORS[0],
      });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: t("common.success"), description: t("events.deleted") });
      setViewEvent(null);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (event: Event) => {
      await apiRequest("PATCH", `/api/events/${event.id}`, event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: t("common.success"), description: t("events.updated") });
      setViewEvent(null);
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const daySessions = getSessionsForDay(sessions, selectedDate);
  const dayInternalEvents = getInternalEventsForDay(filteredInternalEvents, selectedDate);

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.startDate) return;
    createEventMutation.mutate(newEvent as InsertEvent);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <Card className="lg:col-span-2 h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">{t("calendar.title")}</CardTitle>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="show-classes" className="text-sm">
                      {t("calendar.showClasses")}
                    </Label>
                    <Switch id="show-classes" checked={showClasses} onCheckedChange={setShowClasses} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="show-internal" className="text-sm">
                      {t("calendar.showInternal")}
                    </Label>
                    <Switch
                      id="show-internal"
                      checked={showInternalEvents}
                      onCheckedChange={setShowInternalEvents}
                    />
                  </div>
                  {showInternalEvents && (
                    <div className="space-y-2 pt-1 border-t">
                      <h4 className="font-medium text-sm">{t("events.internalEvents")}</h4>
                      <div className="flex flex-wrap gap-2">
                        {INTERNAL_COLORS.map((color) => (
                          <div
                            key={color}
                            className={cn(
                              "w-6 h-6 rounded-full cursor-pointer border-2 transition-all flex items-center justify-center",
                              selectedColors.includes(color)
                                ? "border-primary opacity-100"
                                : "border-transparent opacity-30",
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setSelectedColors((prev) =>
                                prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
                              );
                            }}
                          >
                            {selectedColors.includes(color) && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => setSelectedColors(INTERNAL_COLORS)}
                      >
                        {t("common.all")}
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <MonthlyCalendar
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            sessions={sessions}
            internalEvents={filteredInternalEvents}
            showClasses={showClasses}
            showInternalEvents={showInternalEvents}
            onInternalEventClick={setViewEvent}
            language={language}
            dir={dir}
            className="flex-1"
          />
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CLASS_CALENDAR_COLOR }} />
              {t("calendar.classesLegend")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
              {t("calendar.internalLegend")}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              {format(selectedDate, "EEEE, d MMM", { locale })}
            </CardTitle>
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => {
                    setNewEvent((prev) => ({ ...prev, startDate: format(selectedDate, "yyyy-MM-dd") }));
                  }}
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span className="sr-only sm:not-sr-only sm:ms-2">{t("events.addInternal")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("events.addInternal")}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground -mt-2">{t("events.internalHint")}</p>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>{t("events.title")}</Label>
                    <Input
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder={t("events.titlePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("common.date")}</Label>
                    <Input
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("common.description")}</Label>
                    <Textarea
                      value={newEvent.description || ""}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder={t("events.descriptionPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("events.color")}</Label>
                    <div className="flex gap-2">
                      {INTERNAL_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                            newEvent.color === c ? "border-primary scale-110" : "border-transparent",
                          )}
                          style={{ backgroundColor: c }}
                          onClick={() => setNewEvent({ ...newEvent, color: c })}
                        />
                      ))}
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreateEvent} disabled={createEventMutation.isPending}>
                    {createEventMutation.isPending ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {daySessions.length > 0 || dayInternalEvents.length > 0 ? (
            <div className="divide-y">
              {daySessions.map((session) => (
                <div key={session.id} className="p-4">
                  <div className="flex gap-3">
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          session.status === "scheduled" ? CLASS_CALENDAR_COLOR : "#94a3b8",
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("calendar.classSession")}</p>
                      <h4
                        className={cn(
                          "text-sm font-medium",
                          session.status === "cancelled" && "line-through opacity-60",
                        )}
                      >
                        {session.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {safeFormat(session.startsAt, "HH:mm")} – {safeFormat(session.endsAt, "HH:mm")}
                        {session.coachName ? ` · ${session.coachName}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {dayInternalEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="w-full p-4 hover:bg-muted/50 transition-colors text-start"
                  onClick={() => setViewEvent(event)}
                >
                  <div className="flex gap-3">
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: event.color || INTERNAL_COLORS[0] }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("events.internalEvent")}</p>
                      <h4 className="text-sm font-medium">{event.title}</h4>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
              <CalendarIcon className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm text-center">{t("calendar.noItems")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewEvent} onOpenChange={(open) => !open && setViewEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("events.editEvent")}</DialogTitle>
          </DialogHeader>
          {viewEvent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("events.title")}</Label>
                <Input
                  value={viewEvent.title}
                  onChange={(e) => setViewEvent({ ...viewEvent, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("common.date")}</Label>
                <Input
                  type="date"
                  value={viewEvent.startDate?.slice(0, 10) ?? ""}
                  onChange={(e) => setViewEvent({ ...viewEvent, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("common.description")}</Label>
                <Textarea
                  value={viewEvent.description || ""}
                  onChange={(e) => setViewEvent({ ...viewEvent, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("events.color")}</Label>
                <div className="flex gap-2">
                  {INTERNAL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                        viewEvent.color === c ? "border-primary scale-110" : "border-transparent",
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setViewEvent({ ...viewEvent, color: c })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => deleteEventMutation.mutate(viewEvent.id)}
                  disabled={deleteEventMutation.isPending}
                >
                  {deleteEventMutation.isPending ? t("common.deleting") : t("common.delete")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => updateEventMutation.mutate(viewEvent)}
                  disabled={updateEventMutation.isPending}
                >
                  {updateEventMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
