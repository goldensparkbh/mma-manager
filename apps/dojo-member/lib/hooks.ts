import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { useAuth } from "./auth";
import { createApi } from "./api";
import type { Booking, CampEvent, ClassSession, MemberPayment, Package } from "./types";

export type { Booking, CampEvent, ClassSession, MemberPayment, Package };

export function usePortalRange() {
  const from = new Date().toISOString();
  const to = addDays(new Date(), 14).toISOString();
  return { from, to };
}

export function useClasses() {
  const { api, member } = useAuth();
  const { from, to } = usePortalRange();
  return useQuery<ClassSession[]>({
    queryKey: ["portal", "classes", from, to],
    queryFn: () =>
      api.get<ClassSession[]>(
        `/api/portal/classes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
    enabled: !!member,
  });
}

export function useCoaches() {
  const { api, member } = useAuth();
  return useQuery<Array<{ id: string; name: string; bio?: string | null }>>({
    queryKey: ["portal", "coaches"],
    queryFn: () => api.get("/api/portal/coaches"),
    enabled: !!member,
    staleTime: 60_000,
  });
}

export function useBookings() {
  const { api } = useAuth();
  return useQuery<Booking[]>({
    queryKey: ["portal", "bookings"],
    queryFn: () => api.get<Booking[]>("/api/portal/bookings"),
  });
}

export function useCamps() {
  const { api } = useAuth();
  return useQuery<CampEvent[]>({
    queryKey: ["portal", "camps"],
    queryFn: () => api.get<CampEvent[]>("/api/portal/camps"),
  });
}

export function usePackages() {
  const { api } = useAuth();
  return useQuery<Package[]>({
    queryKey: ["portal", "packages"],
    queryFn: () => api.get<Package[]>("/api/portal/packages"),
  });
}

export function usePayments() {
  const { api } = useAuth();
  return useQuery<MemberPayment[]>({
    queryKey: ["portal", "payments"],
    queryFn: () => api.get<MemberPayment[]>("/api/portal/payments"),
  });
}

export function useFamily() {
  const { api } = useAuth();
  return useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["portal", "family"],
    queryFn: () => api.get<Array<{ id: string; name: string }>>("/api/portal/family-members"),
  });
}

export function useQr() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["portal", "qr"],
    queryFn: () => api.get<{ token: string; checkInUrl: string }>("/api/portal/qr"),
    staleTime: 5 * 60_000,
  });
}

export function useBookClass() {
  const { api } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.post("/api/portal/bookings", { sessionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal", "bookings"] });
      qc.invalidateQueries({ queryKey: ["portal", "classes"] });
    },
  });
}

export function useCancelBooking() {
  const { api } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/portal/bookings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal", "bookings"] }),
  });
}

export function useRegisterCamp() {
  const { api } = useAuth();
  return useMutation({
    mutationFn: (campId: string) =>
      api.post(`/api/portal/camps/${campId}/register`, {}),
  });
}

export function useCheckout() {
  const { api } = useAuth();
  return useMutation({
    mutationFn: (input: { packageId: string; redirectUrl?: string }) =>
      api.post<{ url: string }>("/api/portal/payments/checkout", input),
  });
}

export type AttendanceRecord = {
  id: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
};

export function useAttendance() {
  const { api } = useAuth();
  return useQuery<AttendanceRecord[]>({
    queryKey: ["portal", "attendance"],
    queryFn: () => api.get<AttendanceRecord[]>("/api/portal/attendance"),
  });
}

export type BeltAward = {
  id: string;
  beltId: string;
  beltName?: string | null;
  beltColor?: string | null;
  stripes?: number;
  awardedAt?: string;
};

export function useProgression() {
  const { api } = useAuth();
  return useQuery<{ belts: Array<{ id: string; name: string; color: string }>; memberBelts: BeltAward[] }>({
    queryKey: ["portal", "progression"],
    queryFn: () => api.get("/api/portal/progression"),
  });
}

export function useConfirmPayment(tapId: string | null) {
  return useQuery<{ ok: boolean; status: string }>({
    queryKey: ["portal", "payment-confirm", tapId],
    queryFn: () =>
      createApi().get(`/api/portal/payments/confirm?tap_id=${encodeURIComponent(tapId!)}`),
    enabled: !!tapId,
    retry: 1,
  });
}
