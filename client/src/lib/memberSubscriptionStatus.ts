import { parseISO, startOfDay, endOfDay, isBefore, isAfter, differenceInDays } from "date-fns";
import type { Member, Subscription } from "@shared/schema";

/** Matches member-details-dialog / dashboard "soon" windows */
export const ABOUT_TO_EXPIRE_MEMBER_DAYS = 10;

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True if this member has any subscription that has not started yet (renewal / future plan). */
export function memberHasFutureStartingSubscription(
  memberId: string,
  subscriptions: Subscription[] | undefined,
  todayStr: string
): boolean {
  if (!subscriptions?.length) return false;
  return subscriptions.some((s) => s.memberId === memberId && s.startDate > todayStr);
}

export type EffectiveMemberSubscriptionStatus =
  | "inactive"
  | "upcoming"
  | "active"
  | "aboutToExpire"
  | "expired";

/**
 * Picks the same "winning" subscription as syncMemberSubscriptionStatus:
 * active (latest end) → upcoming (earliest start) → most recently ended.
 */
export function resolvePrimarySubscription(
  member: Member,
  subscriptions: Subscription[] | undefined
): { startDate: string; endDate: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (subscriptions !== undefined && subscriptions.length > 0) {
    const valid = subscriptions.filter((s) => s.startDate && s.endDate);
    if (valid.length === 0) return null;

    const activeSubs = valid
      .filter((s) => {
        const start = startOfDay(parseISO(s.startDate));
        const end = endOfDay(parseISO(s.endDate));
        return !isBefore(today, start) && !isAfter(today, end);
      })
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

    if (activeSubs.length > 0) {
      const s = activeSubs[0];
      return { startDate: s.startDate, endDate: s.endDate };
    }

    const upcomingSubs = valid
      .filter((s) => isBefore(today, startOfDay(parseISO(s.startDate))))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    if (upcomingSubs.length > 0) {
      const s = upcomingSubs[0];
      return { startDate: s.startDate, endDate: s.endDate };
    }

    const pastSubs = valid
      .filter((s) => isAfter(today, endOfDay(parseISO(s.endDate))))
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

    if (pastSubs.length > 0) {
      const s = pastSubs[0];
      return { startDate: s.startDate, endDate: s.endDate };
    }
    return null;
  }

  if (!member.subscriptionEnd) return null;
  return {
    startDate: member.subscriptionStart || "",
    endDate: member.subscriptionEnd,
  };
}

/**
 * Effective status from all subscriptions when available; otherwise member fields.
 * Use this when subscription rows are more up to date than denormalized member.* dates.
 */
export function getEffectiveMemberSubscriptionStatus(
  member: Member,
  subscriptions: Subscription[] | undefined
): EffectiveMemberSubscriptionStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const primary = resolvePrimarySubscription(member, subscriptions);
  if (primary?.startDate && primary?.endDate) {
    try {
      const start = startOfDay(parseISO(primary.startDate));
      const end = endOfDay(parseISO(primary.endDate));
      if (isBefore(today, start)) return "upcoming";
      if (isAfter(today, end)) return "expired";
      const daysLeft = differenceInDays(end, today);
      if (daysLeft <= ABOUT_TO_EXPIRE_MEMBER_DAYS) {
        if (memberHasFutureStartingSubscription(member.id, subscriptions, formatLocalDate(today))) {
          return "active";
        }
        return "aboutToExpire";
      }
      return "active";
    } catch {
      /* fall through */
    }
  }

  if (!member.subscriptionEnd) {
    if (member.status === "upcoming") return "upcoming";
    return "inactive";
  }

  const end = new Date(member.subscriptionEnd);
  const start = member.subscriptionStart ? new Date(member.subscriptionStart) : null;
  if (Number.isNaN(end.getTime())) {
    return member.status === "upcoming" ? "upcoming" : "inactive";
  }
  end.setHours(0, 0, 0, 0);
  if (start) start.setHours(0, 0, 0, 0);
  if (start && today < start) return "upcoming";
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= ABOUT_TO_EXPIRE_MEMBER_DAYS) {
    if (memberHasFutureStartingSubscription(member.id, subscriptions, formatLocalDate(today))) {
      return "active";
    }
    return "aboutToExpire";
  }
  return "active";
}
