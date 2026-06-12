import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClassSession, Event } from "@shared/schema";
import { safeFormat, safeIsSameDay } from "@/lib/formatDate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SCHEDULE_WEEK_STARTS_ON = 6 as const; // Saturday
export const CLASS_CALENDAR_COLOR = "#004aad";

export function getMonthCalendarDays(month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: SCHEDULE_WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: SCHEDULE_WEEK_STARTS_ON });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function getSessionsForDay(sessions: ClassSession[], date: Date) {
  return sessions
    .filter((session) => isSameDay(new Date(session.startsAt), date))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function getInternalEventsForDay(events: Event[], date: Date) {
  return events.filter((event) => safeIsSameDay(event.startDate, date));
}

type MonthlyCalendarProps = {
  month: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  sessions: ClassSession[];
  internalEvents?: Event[];
  showClasses?: boolean;
  showInternalEvents?: boolean;
  onClassClick?: (session: ClassSession) => void;
  onInternalEventClick?: (event: Event) => void;
  language: "ar" | "en";
  dir?: "ltr" | "rtl";
  className?: string;
};

export function MonthlyCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  sessions,
  internalEvents = [],
  showClasses = true,
  showInternalEvents = true,
  onClassClick,
  onInternalEventClick,
  language,
  dir = "ltr",
  className,
}: MonthlyCalendarProps) {
  const locale = language === "ar" ? ar : enUS;
  const calendarDays = getMonthCalendarDays(month);
  const weekDays =
    language === "ar"
      ? ["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"]
      : ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

  const itemsForDay = (date: Date) => {
    const classItems = showClasses
      ? getSessionsForDay(sessions, date).map((session) => ({
          key: `class-${session.id}`,
          label: session.name,
          sublabel: safeFormat(session.startsAt, "HH:mm"),
          color: session.status === "scheduled" ? CLASS_CALENDAR_COLOR : "#94a3b8",
          cancelled: session.status === "cancelled",
          onClick: onClassClick ? () => onClassClick(session) : undefined,
        }))
      : [];

    const eventItems = showInternalEvents
      ? getInternalEventsForDay(internalEvents, date).map((event) => ({
          key: `event-${event.id}`,
          label: event.title,
          sublabel: undefined,
          color: event.color || "#8b5cf6",
          cancelled: false,
          onClick: onInternalEventClick ? () => onInternalEventClick(event) : undefined,
        }))
      : [];

    return [...classItems, ...eventItems];
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">
          {format(month, "MMMM yyyy", { locale })}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(month, 1))}>
            {dir === "rtl" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(month, 1))}>
            {dir === "rtl" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2 text-center text-xs text-muted-foreground">
        {weekDays.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">
        {calendarDays.map((date) => {
          const dayItems = itemsForDay(date);
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          const inMonth = isSameMonth(date, month);

          return (
            <div
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={cn(
                "min-h-[4.5rem] p-1 border rounded-md cursor-pointer transition-colors relative overflow-hidden",
                isSelected ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/50",
                isToday ? "bg-accent/50" : "bg-card",
                !inMonth && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {format(date, "d")}
              </span>

              <div className="mt-1 space-y-0.5">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick?.();
                    }}
                    className={cn(
                      "w-full text-[10px] truncate rounded px-1 text-white text-start",
                      item.cancelled && "line-through opacity-70",
                      item.onClick && "hover:opacity-90",
                    )}
                    style={{ backgroundColor: item.color }}
                    title={item.sublabel ? `${item.label} · ${item.sublabel}` : item.label}
                  >
                    {item.sublabel ? `${item.sublabel} ${item.label}` : item.label}
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <div className="text-[10px] text-muted-foreground ps-1">+{dayItems.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
