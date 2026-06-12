import { addDays, startOfDay } from "date-fns";
import { useMemo } from "react";

/** Stable from/to for schedule queries — keyed by calendar day, not millisecond. */
export function useScheduleRange(daysAhead = 14) {
  const dayKey = new Date().toISOString().split("T")[0];
  return useMemo(() => {
    const start = startOfDay(new Date());
    return {
      dayKey,
      from: start.toISOString(),
      to: addDays(start, daysAhead).toISOString(),
    };
  }, [dayKey, daysAhead]);
}
