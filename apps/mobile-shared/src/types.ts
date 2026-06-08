export type Member = {
  id: string;
  name: string;
  phone: string;
  memberId?: string;
  email?: string | null;
};

export type Subscription = {
  id: string;
  planName: string;
  packageType?: string;
  sessionsRemaining?: number | null;
  startDate?: string;
  endDate?: string;
};

export type ClassSession = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
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

export type CampEvent = {
  id: string;
  title: string;
  startDate: string;
  price?: number;
  capacity?: number;
};

export type PortalInfo = {
  name: string;
  slug: string;
  portalEnabled?: boolean;
  logoUrl?: string;
  primaryColor?: string;
  welcomeMessage?: string;
};

export type StaffUser = {
  id: string;
  email: string;
  displayName?: string;
  role: string;
};

export type BookingSettings = {
  publicSlug?: string | null;
};
