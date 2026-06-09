export type Member = { id: string; name: string; phone: string; memberId?: string };
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
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  portalEnabled?: boolean;
};
export type Package = {
  id: string;
  name: string;
  duration: number;
  price: number;
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
