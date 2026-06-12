import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useAuth } from "./auth";
import { getApiUrl } from "./config";
import type { AttendanceRecord, Booking, BookingSettings, ClassSession, ClubSettings, Member, Package, StaffAccount } from "./types";

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
      return body as { member?: { name?: string }; action?: "checkin" | "checkout" };
    },
  });
}

export function useClubSettings() {
  const { api } = useAuth();
  return useQuery<ClubSettings>({
    queryKey: ["staff", "settings"],
    queryFn: () => api.get<ClubSettings>("/api/settings"),
    staleTime: 60_000,
  });
}

export function useUpdateClubSettings() {
  const { api } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ClubSettings>) => api.patch("/api/settings", patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", "settings"] }),
  });
}

export function usePackages() {
  const { api } = useAuth();
  return useQuery<Package[]>({
    queryKey: ["staff", "packages"],
    queryFn: () => api.get<Package[]>("/api/packages"),
  });
}

export function useSavePackage() {
  const { api } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Package> & { id?: string }) =>
      data.id ? api.patch(`/api/packages/${data.id}`, data) : api.post("/api/packages", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", "packages"] }),
  });
}

export function useBookings(from?: string, to?: string) {
  const { api } = useAuth();
  const f = from || new Date().toISOString();
  const t = to || addDays(new Date(), 14).toISOString();
  return useQuery<Booking[]>({
    queryKey: ["staff", "bookings", f, t],
    queryFn: () =>
      api.get<Booking[]>(`/api/bookings?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`),
  });
}

export function useStaffUsers() {
  const { api } = useAuth();
  return useQuery<StaffAccount[]>({
    queryKey: ["staff", "users"],
    queryFn: () => api.get<StaffAccount[]>("/api/users"),
  });
}

export function useInviteStaff() {
  const { api } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; name: string; role: string }) =>
      api.post("/api/users/invite", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", "users"] }),
  });
}

export function useClubTypes() {
  return useQuery<{ id: string; nameEn: string; nameAr?: string | null }[]>({
    queryKey: ["staff", "club-types"],
    queryFn: async () => {
      const rows = await fetch(`${getApiUrl()}/api/club-types`).then((r) => r.json()) as {
        id: string;
        nameEn: string;
        nameAr?: string | null;
      }[];
      return rows.map((row) => ({ id: row.id, nameEn: row.nameEn, nameAr: row.nameAr }));
    },
    staleTime: 300_000,
  });
}
