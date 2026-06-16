export type Member = { id: string; name: string; phone: string; memberId?: string; age?: number | null };
export type AccountMember = {
  id: string;
  name: string;
  age: number | null;
  memberUntil: string | null;
  hasActiveSubscription: boolean;
  planName: string | null;
  packageType: string | null;
  sessionsRemaining: number | null;
  checkInUrl: string | null;
};
export type Subscription = {
  id: string;
  planName: string;
  packageType?: string;
  sessionsRemaining?: number | null;
  endDate?: string;
};
export type ClassSession = {
  id: string;
  name: string;
  startsAt: string;
  capacity: number;
  bookedCount?: number;
  coachName?: string | null;
  location?: string | null;
  status?: string;
};
export type Booking = {
  id: string;
  sessionId: string;
  sessionName?: string;
  startsAt?: string;
  status: string;
};
export type CampEvent = {
  id: string;
  title: string;
  startDate: string;
  price?: number;
  capacity?: number;
};
export type PortalInfo = {
  name: string;
  slug?: string;
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  portalEnabled?: boolean;
  allowSelfRegistration?: boolean;
  location?: string | null;
  phone?: string | null;
  operatingHours?: Record<string, unknown> | null;
  socials?: Record<string, string>;
};
export type Package = {
  id: string;
  name: string;
  duration: number;
  price: number;
  packageAmount?: number;
  platformFee?: number;
  totalAmount?: number;
  packageType?: "duration" | "sessions";
  sessionCount?: number | null;
};
export type MemberPayment = {
  id: string;
  packageName?: string;
  amount: number;
  currency?: string;
  status: string;
  createdAt?: string;
};
export type PublicBranch = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  country?: string | null;
  isDefault?: boolean;
};
export type BranchAccessScope = "home_branch" | "same_country" | "all_branches";
export type BranchAccessInfo = {
  scope: BranchAccessScope;
  homeBranch: PublicBranch | null;
  accessibleBranches: PublicBranch[];
};
