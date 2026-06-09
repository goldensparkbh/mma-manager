import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useAuth } from "./auth";
import { getApiUrl } from "./config";
import type { AttendanceRecord, BookingSettings, ClassSession, Member } from "./types";

const today = () => new Date().toISOString().split("T")[0];

export function useBookingSettings() {
  const { api } = useAuth();
  return useQuery<BookingSettings>({
    queryKey: ["staff", "booking-settings"],
    queryFn: () => api.get<BookingSettings>("/api/booking-settings"),
    staleTime: 120_000,
  });
}

export function useSessions() {
  const { api } = useAuth();
  const from = new Date().toISOString();
  const to = addDays(new Date(), 7).toISOString();
  return useQuery<ClassSession[]>({
    queryKey: ["staff", "sessions", from, to],
    queryFn: () =>
      api.get<ClassSession[]>(
        `/api/classes/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
  });
}

export function useTodaySessions() {
  const { data: sessions = [], ...rest } = useSessions();
  const d = today();
  const todaySessions = sessions.filter((s: ClassSession) => s.startsAt.startsWith(d) && s.status !== "cancelled");
  return { data: todaySessions, ...rest };
}

export function useAttendance(date = today()) {
  const { api } = useAuth();
  return useQuery<AttendanceRecord[]>({
    queryKey: ["staff", "attendance", date],
    queryFn: () => api.get<AttendanceRecord[]>(`/api/attendance?date=${date}`),
    refetchInterval: 30_000,
  });
}

export function useMembers() {
  const { api } = useAuth();
  return useQuery<Member[]>({
    queryKey: ["staff", "members"],
    queryFn: () => api.get<Member[]>("/api/members"),
    staleTime: 60_000,
  });
}

export function useManualCheckIn() {
  const { api } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { memberId: string; memberName: string }) => {
      const now = new Date();
      return api.post("/api/attendance", {
        memberId: data.memberId,
        memberName: data.memberName,
        date: today(),
        checkIn: now.toISOString(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", "attendance"] }),
  });
}

export function useQrCheckIn(slug: string) {
  return useMutation({
    mutationFn: async (qrToken: string) => {
      const res = await fetch(`${getApiUrl()}/api/public/${slug}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Check-in failed");
      return body as { member?: { name?: string }; alreadyCheckedIn?: boolean };
    },
  });
}
