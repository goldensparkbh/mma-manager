import { useQuery } from "@tanstack/react-query";
import { createApi } from "./api";
import { useAuth } from "./auth";
import type { BranchAccessInfo, PublicBranch } from "./types";

const publicApi = createApi();

export function usePublicBranches(slug: string) {
  return useQuery<PublicBranch[]>({
    queryKey: ["public", "branches", slug],
    queryFn: () => publicApi.get(`/api/public/${slug}/branches`),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function useBranchAccess() {
  const { api, member } = useAuth();
  return useQuery<BranchAccessInfo>({
    queryKey: ["portal", "branches"],
    queryFn: () => api.get("/api/portal/branches"),
    enabled: !!member,
    staleTime: 60_000,
  });
}
