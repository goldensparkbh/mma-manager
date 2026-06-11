export type StaffUser = {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  coachId?: string | null;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status?: string;
};

export type TenantSubscription = {
  planSlug?: string;
  planName?: string;
  maxMembers?: number;
  maxUsers?: number;
  features?: string[];
};

export type PlanLimits = {
  maxMembers: number;
  maxUsers: number;
  planSlug: string;
};

export type ClubSettings = {
  name?: string;
  phone?: string;
  location?: string;
  managerEmail?: string;
  logoUrlLight?: string;
  logoUrlDark?: string;
  welcomeMessage?: string;
  portalWelcomeMessage?: string;
};

export type Package = {
  id: string;
  name: string;
  price: number;
  duration: number;
  packageType?: string;
  sessionCount?: number | null;
  active?: boolean;
};

export type Booking = {
  id: string;
  memberId: string;
  memberName?: string;
  sessionId: string;
  status?: string;
  createdAt?: string;
};

export type StaffAccount = {
  id: string;
  email: string;
  displayName?: string;
  role: string;
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

export type BookingSettings = {
  publicSlug?: string;
  portalEnabled?: boolean;
};

export type AttendanceRecord = {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  checkIn?: string | null;
};

export type Member = {
  id: string;
  name: string;
  phone?: string;
  status?: string;
};

export type ClubTypeOption = {
  id: string;
  label: string;
};
