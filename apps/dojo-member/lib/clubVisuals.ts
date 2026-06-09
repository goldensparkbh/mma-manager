import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type IonName = ComponentProps<typeof Ionicons>["name"];

export type ClubTypeVisual = {
  icon: IonName;
  color: string;
  colorSoft: string;
  label: string;
};

const DEFAULT: ClubTypeVisual = {
  icon: "grid",
  color: "#3b82f6",
  colorSoft: "#dbeafe",
  label: "Sports club",
};

export const CLUB_TYPE_VISUALS: Record<string, ClubTypeVisual> = {
  karate: { icon: "ribbon", color: "#ea580c", colorSoft: "#ffedd5", label: "Karate" },
  taekwondo: { icon: "footsteps", color: "#2563eb", colorSoft: "#dbeafe", label: "Taekwondo" },
  judo: { icon: "hand-left", color: "#4f46e5", colorSoft: "#e0e7ff", label: "Judo" },
  bjj: { icon: "shield", color: "#0d9488", colorSoft: "#ccfbf1", label: "BJJ" },
  aikido: { icon: "sync", color: "#64748b", colorSoft: "#f1f5f9", label: "Aikido" },
  muay_thai: { icon: "flame", color: "#dc2626", colorSoft: "#fee2e2", label: "Muay Thai" },
  boxing: { icon: "fitness", color: "#e11d48", colorSoft: "#ffe4e6", label: "Boxing" },
  mma: { icon: "flash", color: "#525252", colorSoft: "#f5f5f5", label: "MMA" },
  wrestling: { icon: "barbell", color: "#d97706", colorSoft: "#fef3c7", label: "Wrestling" },
  krav_maga: { icon: "shield-checkmark", color: "#65a30d", colorSoft: "#ecfccb", label: "Krav Maga" },
  kung_fu: { icon: "sparkles", color: "#9333ea", colorSoft: "#f3e8ff", label: "Kung Fu" },
  capoeira: { icon: "musical-notes", color: "#16a34a", colorSoft: "#dcfce7", label: "Capoeira" },
  football: { icon: "football", color: "#059669", colorSoft: "#d1fae5", label: "Football" },
  basketball: { icon: "basketball", color: "#ea580c", colorSoft: "#ffedd5", label: "Basketball" },
  handball: { icon: "hand-right", color: "#dc2626", colorSoft: "#fee2e2", label: "Handball" },
  volleyball: { icon: "tennisball", color: "#2563eb", colorSoft: "#dbeafe", label: "Volleyball" },
  tennis: { icon: "tennisball", color: "#84cc16", colorSoft: "#ecfccb", label: "Tennis" },
  swimming: { icon: "water", color: "#0891b2", colorSoft: "#cffafe", label: "Swimming" },
  gymnastics: { icon: "body", color: "#db2777", colorSoft: "#fce7f3", label: "Gymnastics" },
  weightlifting: { icon: "barbell", color: "#475569", colorSoft: "#f1f5f9", label: "Weightlifting" },
  general_gym: { icon: "barbell", color: "#0891b2", colorSoft: "#cffafe", label: "Gym" },
  crossfit: { icon: "flame", color: "#f97316", colorSoft: "#ffedd5", label: "CrossFit" },
  parkour: { icon: "walk", color: "#7c3aed", colorSoft: "#ede9fe", label: "Parkour" },
  climbing: { icon: "trending-up", color: "#d97706", colorSoft: "#fef3c7", label: "Climbing" },
  hybrid: { icon: "apps", color: "#3b82f6", colorSoft: "#dbeafe", label: "Multi-sport" },
};

export function getClubTypeVisual(clubType?: string | null): ClubTypeVisual {
  if (!clubType) return DEFAULT;
  return CLUB_TYPE_VISUALS[clubType] || DEFAULT;
}

export const CATEGORY_LABELS: Record<string, string> = {
  martial_arts: "Martial arts",
  team_sports: "Team sports",
  fitness: "Fitness",
  specialty: "Specialty",
  hybrid: "Multi-sport",
};
