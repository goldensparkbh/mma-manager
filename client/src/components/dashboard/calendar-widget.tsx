import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; // We might need a custom calendar implementation if the shadcn one is too limited for events
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Event, InsertEvent } from "@shared/schema";
import { useLanguage } from "@/context/language-context";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { safeIsSameDay } from "@/lib/formatDate";
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export function CalendarWidget() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [viewEvent, setViewEvent] = useState<Event | null>(null);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [selectedColors, setSelectedColors] = useState<string[]>([
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"
    ]);
    const [newEvent, setNewEvent] = useState<Partial<InsertEvent>>({
        title: "",
        description: "",
        startDate: new Date().toISOString().split('T')[0],
        isAllDay: true,
        color: "#3b82f6"
    });

    const { data: events, isLoading } = useQuery<Event[]>({
        queryKey: ["/api/events"],
    });

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
                startDate: new Date().toISOString().split('T')[0],
                isAllDay: true,
                color: "#3b82f6"
            });
        },
        onError: (error: Error) => {
            toast({ title: t("common.error"), description: error.message, variant: "destructive" });
        }
    });

    const deleteEventMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/events/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
            toast({ title: t("common.success"), description: t("events.deleted") });
            setViewEvent(null);
        }
    });

    const updateEventMutation = useMutation({
        mutationFn: async (event: Event) => {
            // We need to implement PUT /api/events/:id or similar. 
            // Since we don't have a specific update endpoint in the plan yet, 
            // let's assume valid implementation or add it. 
            // Wait, I only added create/delete in firebaseData.ts. I need to add updateEvent there too.
            // For now I will pause here to fix the backend first 
            // BUT I can't pause mid-step easily. 
            // Actually, I can use createEvent with merge logic if I modify it or just add updateEvent now.
            // I'll assume I will add updateEvent to firebaseData in the next step.
            await apiRequest("PATCH", `/api/events/${event.id}`, event);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/events"] });
            toast({ title: t("common.success"), description: t("events.updated") });
            setViewEvent(null);
        },
        onError: (error: Error) => {
            toast({ title: t("common.error"), description: error.message, variant: "destructive" });
        }
    });

    const isMobile = useIsMobile();

    const handleCreateEvent = () => {
        if (!newEvent.title || !newEvent.startDate) return;
        createEventMutation.mutate(newEvent as InsertEvent);
    };

    const next = () => {
        if (isMobile) {
            setCurrentDate(addWeeks(currentDate, 1));
        } else {
            setCurrentDate(addMonths(currentDate, 1));
        }
    };

    const prev = () => {
        if (isMobile) {
            setCurrentDate(subWeeks(currentDate, 1));
        } else {
            setCurrentDate(subMonths(currentDate, 1));
        }
    };

    const calendarDays = eachDayOfInterval({
        start: isMobile ? startOfWeek(currentDate) : startOfMonth(currentDate),
        end: isMobile ? endOfWeek(currentDate) : endOfMonth(currentDate)
    });

    const getEventsForDay = (date: Date) => {
        return events?.filter(event => {
            const matchesDate = safeIsSameDay(event.startDate, date);
            const matchesColor = event.color ? selectedColors.includes(event.color) : true;
            return matchesDate && matchesColor;
        }) || [];
    };

    const selectedDayEvents = getEventsForDay(selectedDate);

    const colors = [
        "#3b82f6", // blue
        "#ef4444", // red
        "#10b981", // green
        "#f59e0b", // yellow
        "#8b5cf6", // purple
        "#ec4899", // pink
    ];

    const weekDays = language === 'ar'
        ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Calendar View (Desktop: Month, Mobile: Day picker) */}
            <Card className="lg:col-span-2 h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">
                        {isMobile
                            ? format(currentDate, "MMMM d, yyyy", { locale: language === 'ar' ? ar : enUS })
                            : format(currentDate, "MMMM yyyy", { locale: language === 'ar' ? ar : enUS })
                        }
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-3" align="end">
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm">{t("common.filter")}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {colors.map(color => (
                                            <div
                                                key={color}
                                                className={cn(
                                                    "w-6 h-6 rounded-full cursor-pointer border-2 transition-all flex items-center justify-center",
                                                    selectedColors.includes(color) ? "border-primary opacity-100" : "border-transparent opacity-30"
                                                )}
                                                style={{ backgroundColor: color }}
                                                onClick={() => {
                                                    setSelectedColors(prev =>
                                                        prev.includes(color)
                                                            ? prev.filter(c => c !== color)
                                                            : [...prev, color]
                                                    );
                                                }}
                                            >
                                                {selectedColors.includes(color) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full h-7 text-xs"
                                        onClick={() => setSelectedColors(colors)}
                                    >
                                        {t("common.all")}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" onClick={prev}>
                            <ChevronRight className={cn("h-4 w-4", language === 'ar' ? "" : "rotate-180")} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={next}>
                            <ChevronLeft className={cn("h-4 w-4", language === 'ar' ? "" : "rotate-180")} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 mb-2 text-center text-xs text-muted-foreground">
                        {weekDays.map(day => (
                            <div key={day} className="py-1">{day}</div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 h-full">
                        {/* Empty cells for start of month offset - hide on mobile week view */}
                        {!isMobile && Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[4rem] bg-muted/20 rounded-md" />
                        ))}

                        {calendarDays.map((date, i) => {
                            const dayEvents = getEventsForDay(date);
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, new Date());

                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "min-h-[4rem] p-1 border rounded-md cursor-pointer transition-colors relative overflow-hidden group",
                                        isSelected ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/50",
                                        isToday ? "bg-accent/50" : "bg-card"
                                    )}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={cn(
                                            "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full",
                                            isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                        )}>
                                            {format(date, "d")}
                                        </span>
                                    </div>

                                    {/* Event Dots/Bars */}
                                    <div className="mt-1 space-y-1">
                                        {dayEvents.slice(0, 3).map(event => (
                                            <div
                                                key={event.id}
                                                className="text-[10px] truncate rounded px-1 text-white"
                                                style={{ backgroundColor: event.color || "#3b82f6" }}
                                                title={event.title}
                                            >
                                                {event.title}
                                            </div>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-[10px] text-muted-foreground pl-1">
                                                +{dayEvents.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                            {format(selectedDate, "EEEE, d MMM", { locale: language === 'ar' ? ar : enUS })}
                        </CardTitle>
                        <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" onClick={() => {
                                    setNewEvent(prev => ({ ...prev, startDate: format(selectedDate, 'yyyy-MM-dd') }));
                                }}>
                                    <Plus className="h-4 w-4 flex-shrink-0" />
                                    <span className="sr-only sm:not-sr-only sm:ml-2">{t("common.add")}</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t("events.addEvent")}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>{t("events.title")}</Label>
                                        <Input
                                            value={newEvent.title}
                                            onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                            placeholder={t("events.titlePlaceholder")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("common.date")}</Label>
                                        <Input
                                            type="date"
                                            value={newEvent.startDate}
                                            onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("common.description")}</Label>
                                        <Textarea
                                            value={newEvent.description || ""}
                                            onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                            placeholder={t("events.descriptionPlaceholder")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("events.color")}</Label>
                                        <div className="flex gap-2">
                                            {colors.map(c => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    className={cn(
                                                        "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                                        newEvent.color === c ? "border-primary scale-110" : "border-transparent"
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
                    {selectedDayEvents.length > 0 ? (
                        <div className="divide-y">
                            {selectedDayEvents.map(event => (
                                <div
                                    key={event.id}
                                    className="p-4 hover:bg-muted/50 transition-colors group cursor-pointer"
                                    onClick={() => setViewEvent(event)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-3">
                                            <div
                                                className="w-1 self-stretch rounded-full"
                                                style={{ backgroundColor: event.color || "#3b82f6" }}
                                            />
                                            <div>
                                                <h4 className="text-sm font-medium">{event.title}</h4>
                                                {event.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {event.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                            <CalendarIcon className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">{t("events.noEvents")}</p>
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
                                    onChange={e => setViewEvent({ ...viewEvent, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("common.date")}</Label>
                                <Input
                                    type="date"
                                    value={viewEvent.startDate}
                                    onChange={e => setViewEvent({ ...viewEvent, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("common.description")}</Label>
                                <Textarea
                                    value={viewEvent.description || ""}
                                    onChange={e => setViewEvent({ ...viewEvent, description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("events.color")}</Label>
                                <div className="flex gap-2">
                                    {colors.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={cn(
                                                "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                                viewEvent.color === c ? "border-primary scale-110" : "border-transparent"
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
