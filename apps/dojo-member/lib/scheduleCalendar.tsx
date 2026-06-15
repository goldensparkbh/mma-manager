import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useMemo, useState, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { useTypography } from "@/lib/fonts";
import { spacing, useThemeColors, withAlpha } from "@/lib/theme";

export const CALENDAR_WEEK_STARTS_ON = 6 as const; // Saturday

export type CalendarSessionItem = {
  id: string;
  name: string;
  startsAt: string;
};

export function getMonthCalendarDays(month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function getSessionsForDay<T extends CalendarSessionItem>(sessions: T[], date: Date) {
  return sessions
    .filter((s) => isSameDay(new Date(s.startsAt), date))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function firstSessionDate(sessions: CalendarSessionItem[]) {
  if (!sessions.length) return new Date();
  return startOfDay(
    sessions.reduce((earliest, s) => {
      const d = new Date(s.startsAt);
      return d < earliest ? d : earliest;
    }, new Date(sessions[0].startsAt)),
  );
}

type Props<T extends CalendarSessionItem> = {
  sessions: T[];
  accent?: string;
  horizontalPadding?: number;
  onSessionPress?: (session: T) => void;
  renderSession: (session: T) => ReactNode;
  emptyDayLabel?: string;
};

export function ScheduleMonthCalendar<T extends CalendarSessionItem>({
  sessions,
  accent: accentProp,
  horizontalPadding = spacing.md,
  onSessionPress,
  renderSession,
  emptyDayLabel,
}: Props<T>) {
  const colors = useThemeColors();
  const accent = accentProp || colors.primary;
  const { locale, t } = useI18n();
  const typo = useTypography();
  const { width } = useWindowDimensions();
  const dateLocale = locale === "ar" ? ar : enUS;

  const initialMonth = useMemo(() => startOfMonth(firstSessionDate(sessions)), [sessions]);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = startOfDay(new Date());
    if (getSessionsForDay(sessions, today).length) return today;
    return firstSessionDate(sessions);
  });

  const calendarDays = useMemo(() => getMonthCalendarDays(month), [month]);
  const weekDays = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return format(d, "EEE", { locale: dateLocale });
    });
  }, [dateLocale]);

  const gridWidth = width - horizontalPadding * 2;
  const cellSize = Math.floor(gridWidth / 7);
  const cellHeight = Math.max(44, Math.min(52, Math.round(cellSize * 0.92)));

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const s of sessions) {
      const key = format(new Date(s.startsAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return map;
  }, [sessions]);

  const selectedSessions = useMemo(
    () => getSessionsForDay(sessions, selectedDate),
    [sessions, selectedDate],
  );

  const monthLabel = format(month, "MMMM yyyy", { locale: dateLocale });
  const selectedLabel = isSameDay(selectedDate, new Date())
    ? t("common.today")
    : format(selectedDate, locale === "ar" ? "EEEE، d MMM" : "EEEE, d MMM", { locale: dateLocale });

  return (
    <View style={styles.wrap}>
      <View style={styles.monthHead}>
        <Text style={[styles.monthTitle, { color: colors.text }, typo.style("bold")]}>
          {monthLabel}
        </Text>
        <View style={styles.monthNav}>
          <Pressable
            onPress={() => setMonth((m) => subMonths(m, 1))}
            style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityLabel={t("calendar.prevMonth")}
          >
            <Ionicons
              name={typo.isRtl ? "chevron-forward" : "chevron-back"}
              size={18}
              color={colors.text}
            />
          </Pressable>
          <Pressable
            onPress={() => setMonth((m) => addMonths(m, 1))}
            style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityLabel={t("calendar.nextMonth")}
          >
            <Ionicons
              name={typo.isRtl ? "chevron-back" : "chevron-forward"}
              size={18}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>

      <View style={[styles.weekRow, { width: gridWidth }]}>
        {weekDays.map((label) => (
          <View key={label} style={[styles.weekCell, { width: cellSize }]}>
            <Text style={[styles.weekLabel, { color: colors.textMuted }, typo.style("semibold")]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.grid, { width: gridWidth }]}>
        {calendarDays.map((date) => {
          const key = format(date, "yyyy-MM-dd");
          const daySessions = sessionsByDay.get(key) ?? [];
          const inMonth = isSameMonth(date, month);
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          const count = daySessions.length;

          return (
            <Pressable
              key={key}
              onPress={() => setSelectedDate(startOfDay(date))}
              style={[
                styles.dayCell,
                {
                  width: cellSize,
                  height: cellHeight,
                  borderColor: isSelected ? accent : colors.border,
                  backgroundColor: isSelected
                    ? withAlpha(accent, 0.12)
                    : isToday
                      ? withAlpha(accent, 0.06)
                      : colors.card,
                  opacity: inMonth ? 1 : 0.38,
                },
              ]}
            >
              <View
                style={[
                  styles.dayNumWrap,
                  isToday && !isSelected && { backgroundColor: withAlpha(accent, 0.18) },
                  isSelected && { backgroundColor: accent },
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    typo.style("semibold"),
                    {
                      color: isSelected ? "#fff" : isToday ? accent : colors.text,
                    },
                  ]}
                >
                  {format(date, "d")}
                </Text>
              </View>
              {count > 0 ? (
                <View style={styles.dotRow}>
                  {daySessions.slice(0, 3).map((s) => (
                    <View key={s.id} style={[styles.dot, { backgroundColor: accent }]} />
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.dayListHead}>
        <Text style={[styles.dayListTitle, { color: colors.text }, typo.style("bold")]}>
          {selectedLabel}
        </Text>
        {countLabel(selectedSessions.length, t) ? (
          <Text style={[styles.dayListCount, { color: colors.textMuted }, typo.style("regular")]}>
            {countLabel(selectedSessions.length, t)}
          </Text>
        ) : null}
      </View>

      {selectedSessions.length === 0 ? (
        <Text style={[styles.emptyDay, { color: colors.textMuted }, typo.style("regular")]}>
          {emptyDayLabel ?? t("calendar.noClassesDay")}
        </Text>
      ) : (
        <View style={styles.dayList}>
          {selectedSessions.map((session) => (
            <Pressable
              key={session.id}
              onPress={() => onSessionPress?.(session)}
              disabled={!onSessionPress}
            >
              {renderSession(session)}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function countLabel(n: number, t: ReturnType<typeof useI18n>["t"]) {
  if (n <= 0) return "";
  return t("calendar.classCount").replace("{count}", String(n));
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  monthHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  monthTitle: { fontSize: 17, flex: 1 },
  monthNav: { flexDirection: "row", gap: 6 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: { flexDirection: "row", alignSelf: "center" },
  weekCell: { alignItems: "center", paddingVertical: 4 },
  weekLabel: { fontSize: 11, textTransform: "capitalize" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignSelf: "center",
    gap: 0,
  },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 2,
  },
  dayNumWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: { fontSize: 13 },
  dotRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
    minHeight: 5,
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dayListHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  dayListTitle: { fontSize: 15, flex: 1 },
  dayListCount: { fontSize: 12, fontWeight: "600" },
  emptyDay: { fontSize: 14, lineHeight: 20, paddingVertical: spacing.sm },
  dayList: { gap: spacing.sm },
});
