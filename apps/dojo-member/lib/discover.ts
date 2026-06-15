import { useQuery } from "@tanstack/react-query";
import { createApi } from "./api";
import { useScheduleRange } from "./scheduleRange";

const publicApi = createApi();

export type DiscoverClub = {
  id: string;
  name: string;
  slug: string;
  portalSlug: string;
  clubType: string;
  sportTypeIds?: string[];
  location?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  welcomeMessage?: string | null;
  upcomingClassCount: number;
  nextClassAt?: string | null;
};

export type ClubProfile = DiscoverClub & {
  memberCount: number;
  portalEnabled: boolean;
  socials?: Record<string, string>;
  operatingHours?: Record<string, unknown> | null;
};

export type DiscoverClass = {
  id: string;
  name: string;
  startsAt: string;
  endsAt?: string;
  capacity: number;
  bookedCount?: number;
  coachName?: string | null;
  location?: string | null;
  clubName: string;
  clubSlug: string;
  clubType: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
};

export type ClubTypeOption = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  category: string;
  imageUrl?: string | null;
};

export type DiscoverPromoBanner = {
  id: string;
  sortOrder: number;
  locale?: "en" | "ar";
  imageUrl: string;
  clubTypeId: string | null;
  linkUrl: string | null;
};

export function useDiscoverBanners(locale: "en" | "ar") {
  return useQuery<DiscoverPromoBanner[]>({
    queryKey: ["discover", "banners", locale],
    queryFn: () => publicApi.get(`/api/discover/banners?locale=${locale}`),
    staleTime: 60_000,
  });
}

export function useClubTypes() {
  return useQuery<ClubTypeOption[]>({
    queryKey: ["club-types"],
    queryFn: () => publicApi.get("/api/club-types"),
    staleTime: 60 * 60_000,
  });
}

export function useDiscoverClubs(q?: string, clubType?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (clubType) params.set("clubType", clubType);
  params.set("limit", "100");
  const qs = params.toString();
  return useQuery<{ clubs: DiscoverClub[]; total: number }>({
    queryKey: ["discover", "clubs", q, clubType],
    queryFn: () => publicApi.get(`/api/clubs?${qs}`),
    staleTime: 30_000,
  });
}

export function useDiscoverClubsMap(opts?: {
  q?: string;
  clubType?: string;
  country?: string;
  city?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.clubType) params.set("clubType", opts.clubType);
  if (opts?.country) params.set("country", opts.country);
  if (opts?.city) params.set("city", opts.city);
  params.set("hasLocation", "true");
  params.set("limit", "500");
  const qs = params.toString();
  return useQuery<{ clubs: DiscoverClub[]; total: number }>({
    queryKey: ["discover", "clubs", "map", opts?.q, opts?.clubType, opts?.country, opts?.city],
    queryFn: () => publicApi.get(`/api/clubs?${qs}`),
    staleTime: 30_000,
  });
}

export type MapFilterCountry = { code: string; count: number };
export type MapFilterCity = { country: string; city: string; count: number };

export function useDiscoverMapFilters() {
  return useQuery<{ countries: MapFilterCountry[]; cities: MapFilterCity[] }>({
    queryKey: ["discover", "clubs", "map-filters"],
    queryFn: () => publicApi.get("/api/clubs/map-filters"),
    staleTime: 60_000,
  });
}

export function useClubProfile(slug: string) {
  return useQuery<ClubProfile>({
    queryKey: ["discover", "club", slug],
    queryFn: () => publicApi.get(`/api/clubs/${slug}`),
    enabled: !!slug,
  });
}

export function useDiscoverSchedule(opts?: { q?: string; clubType?: string; clubSlug?: string }) {
  const { dayKey, from, to } = useScheduleRange();
  const params = new URLSearchParams({ from, to, limit: "100" });
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.clubType) params.set("clubType", opts.clubType);
  if (opts?.clubSlug) params.set("clubSlug", opts.clubSlug);
  return useQuery<DiscoverClass[]>({
    queryKey: ["discover", "schedule", dayKey, opts?.q, opts?.clubType, opts?.clubSlug],
    queryFn: () => publicApi.get(`/api/discover/schedule?${params}`),
    staleTime: 30_000,
  });
}

export function usePublicClubInfo(slug: string) {
  return useQuery({
    queryKey: ["public", "club", slug, "info"],
    queryFn: () =>
      publicApi.get<{
        name: string;
        slug: string;
        logoUrl?: string;
        primaryColor?: string;
        welcomeMessage?: string;
        portalEnabled?: boolean;
      }>(`/api/portal/${slug}/info`),
    enabled: !!slug,
  });
}

export function usePublicSchedule(slug: string) {
  const { dayKey, from, to } = useScheduleRange();
  return useQuery({
    queryKey: ["public", "club", slug, "schedule", dayKey],
    queryFn: () =>
      publicApi.get<Array<{
        id: string;
        name: string;
        startsAt: string;
        capacity: number;
        bookedCount?: number;
        coachName?: string | null;
        location?: string | null;
      }>>(`/api/public/${slug}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    enabled: !!slug,
  });
}

export function usePublicPackages(slug: string) {
  return useQuery({
    queryKey: ["public", "club", slug, "packages"],
    queryFn: () =>
      publicApi.get<Array<{
        id: string;
        name: string;
        duration: number;
        price: number;
        packageType?: string;
        sessionCount?: number | null;
      }>>(`/api/public/${slug}/packages`),
    enabled: !!slug,
  });
}

export function usePublicCamps(slug: string) {
  return useQuery({
    queryKey: ["public", "club", slug, "camps"],
    queryFn: () =>
      publicApi.get<Array<{
        id: string;
        title: string;
        startDate: string;
        price?: number;
        capacity?: number;
        description?: string;
      }>>(`/api/public/${slug}/camps`),
    enabled: !!slug,
  });
}

export function usePublicCoaches(slug: string) {
  return useQuery({
    queryKey: ["public", "club", slug, "coaches"],
    queryFn: () =>
      publicApi.get<Array<{ id: string; name: string; bio?: string | null }>>(`/api/public/${slug}/coaches`),
    enabled: !!slug,
    staleTime: 60_000,
  });
}
