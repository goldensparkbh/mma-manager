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
};
