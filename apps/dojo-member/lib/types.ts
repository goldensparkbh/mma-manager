export type Member = { id: string; name: string; phone: string; memberId?: string };
export type Subscription = {
  id: string;
  planName: string;
  packageType?: string;
  sessionsRemaining?: number | null;
};
export type ClassSession = {
  id: string;
  name: string;
  startsAt: string;
  capacity: number;
  bookedCount?: number;
  coachName?: string | null;
  location?: string | null;
};
export type Booking = {
  id: string;
  sessionId: string;
  sessionName?: string;
  startsAt?: string;
  status: string;
};
export type CampEvent = { id: string; title: string; startDate: string; price?: number };
export type PortalInfo = {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
};
