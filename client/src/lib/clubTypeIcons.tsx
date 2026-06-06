import type { ClubTypeId } from "@shared/clubTypes";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Activity,
  ArrowUpRight,
  Blend,
  Box,
  Dumbbell,
  Flame,
  Footprints,
  Grip,
  LayoutGrid,
  Mountain,
  Music2,
  Shield,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Wind,
} from "lucide-react";

export type ClubTypeVisual = {
  icon: LucideIcon;
  /** Tailwind classes for icon tile background */
  tileClass: string;
  /** Accent for selected ring */
  accentClass: string;
};

export const CLUB_TYPE_VISUALS: Record<ClubTypeId, ClubTypeVisual> = {
  karate: {
    icon: Award,
    tileClass: "bg-gradient-to-br from-amber-100 to-orange-200 text-orange-700 dark:from-orange-950 dark:to-amber-900 dark:text-orange-300",
    accentClass: "ring-orange-500",
  },
  taekwondo: {
    icon: Footprints,
    tileClass: "bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 dark:from-blue-950 dark:to-sky-900 dark:text-sky-300",
    accentClass: "ring-blue-500",
  },
  judo: {
    icon: Grip,
    tileClass: "bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-700 dark:from-indigo-950 dark:to-violet-900 dark:text-indigo-300",
    accentClass: "ring-indigo-500",
  },
  bjj: {
    icon: Shield,
    tileClass: "bg-gradient-to-br from-emerald-100 to-teal-200 text-teal-800 dark:from-teal-950 dark:to-emerald-900 dark:text-teal-300",
    accentClass: "ring-teal-500",
  },
  aikido: {
    icon: Wind,
    tileClass: "bg-gradient-to-br from-slate-100 to-zinc-200 text-slate-700 dark:from-zinc-900 dark:to-slate-800 dark:text-slate-300",
    accentClass: "ring-slate-500",
  },
  muay_thai: {
    icon: Flame,
    tileClass: "bg-gradient-to-br from-red-100 to-rose-200 text-red-700 dark:from-red-950 dark:to-rose-900 dark:text-red-300",
    accentClass: "ring-red-500",
  },
  boxing: {
    icon: Target,
    tileClass: "bg-gradient-to-br from-rose-100 to-red-200 text-rose-800 dark:from-rose-950 dark:to-red-900 dark:text-rose-300",
    accentClass: "ring-rose-500",
  },
  mma: {
    icon: Swords,
    tileClass: "bg-gradient-to-br from-stone-100 to-neutral-300 text-neutral-800 dark:from-neutral-900 dark:to-stone-800 dark:text-neutral-200",
    accentClass: "ring-neutral-600",
  },
  wrestling: {
    icon: Box,
    tileClass: "bg-gradient-to-br from-yellow-100 to-amber-200 text-amber-900 dark:from-amber-950 dark:to-yellow-900 dark:text-amber-300",
    accentClass: "ring-amber-600",
  },
  krav_maga: {
    icon: ShieldAlert,
    tileClass: "bg-gradient-to-br from-lime-100 to-green-200 text-green-800 dark:from-green-950 dark:to-lime-900 dark:text-lime-300",
    accentClass: "ring-green-600",
  },
  kung_fu: {
    icon: Sparkles,
    tileClass: "bg-gradient-to-br from-fuchsia-100 to-purple-200 text-purple-800 dark:from-purple-950 dark:to-fuchsia-900 dark:text-fuchsia-300",
    accentClass: "ring-purple-500",
  },
  capoeira: {
    icon: Music2,
    tileClass: "bg-gradient-to-br from-green-100 to-emerald-200 text-green-800 dark:from-green-950 dark:to-emerald-900 dark:text-green-300",
    accentClass: "ring-emerald-500",
  },
  general_gym: {
    icon: Dumbbell,
    tileClass: "bg-gradient-to-br from-blue-100 to-cyan-200 text-blue-800 dark:from-blue-950 dark:to-cyan-900 dark:text-cyan-300",
    accentClass: "ring-cyan-500",
  },
  crossfit: {
    icon: Activity,
    tileClass: "bg-gradient-to-br from-orange-100 to-red-200 text-orange-800 dark:from-orange-950 dark:to-red-900 dark:text-orange-300",
    accentClass: "ring-orange-600",
  },
  parkour: {
    icon: ArrowUpRight,
    tileClass: "bg-gradient-to-br from-violet-100 to-indigo-200 text-violet-800 dark:from-violet-950 dark:to-indigo-900 dark:text-violet-300",
    accentClass: "ring-violet-500",
  },
  climbing: {
    icon: Mountain,
    tileClass: "bg-gradient-to-br from-stone-200 to-amber-100 text-stone-800 dark:from-stone-800 dark:to-amber-950 dark:text-amber-200",
    accentClass: "ring-amber-700",
  },
  hybrid: {
    icon: LayoutGrid,
    tileClass: "bg-gradient-to-br from-primary/15 to-primary/30 text-primary",
    accentClass: "ring-primary",
  },
};

export function getClubTypeVisual(id: string): ClubTypeVisual {
  return CLUB_TYPE_VISUALS[id as ClubTypeId] ?? {
    icon: Blend,
    tileClass: "bg-gradient-to-br from-muted to-muted/60 text-muted-foreground",
    accentClass: "ring-primary",
  };
}
