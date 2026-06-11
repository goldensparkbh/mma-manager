/**
 * Seeds 5 demo clubs with full platform data for Nawady.
 * Run: npm run db:seed
 * Reset and re-seed: SEED_RESET=true npm run db:seed
 */
import "../server/load-env.js";
import { pool, query } from "../server/db/index.js";
import * as data from "../server/data.js";
import * as bookings from "../server/bookings.js";
import { createCamp, registerForCamp } from "../server/camps.js";

const DEMO_PASSWORD = "Demo123!";
const MEMBER_PORTAL_PASSWORD = "Member123!";

type StaffDef = { email: string; name: string; role: "admin" | "coach" | "staff"; phone: string };
type MemberDef = {
  name: string;
  phone: string;
  email?: string;
  gender: "male" | "female";
  age: number;
  portal?: boolean;
  beltIndex?: number;
};

type ClubDef = {
  key: string;
  clubName: string;
  clubType: string;
  location: string;
  phone: string;
  primaryColor: string;
  welcomeMessage: string;
  welcomeMessageAr: string;
  staff: StaffDef[];
  members: MemberDef[];
  classTemplates: { name: string; location: string; color: string; hour: number; weekdays: number[] }[];
  products: { name: string; price: number; stock: number; category: string }[];
  camp: { title: string; description: string; daysAhead: number; durationDays: number; price: number; capacity: number };
};

const DEMO_CLUBS: ClubDef[] = [
  {
    key: "karate",
    clubName: "Al Rashid Karate Academy",
    clubType: "karate",
    location: "King Fahd Road, Al Olaya, Riyadh",
    phone: "+966501100001",
    primaryColor: "#dc2626",
    welcomeMessage: "Welcome to Al Rashid — discipline, respect, excellence.",
    welcomeMessageAr: "مرحباً بكم في أكاديمية الراشد للكاراتيه",
    staff: [
      { email: "karate.admin@nawady.demo", name: "Faisal Al-Rashid", role: "admin", phone: "+966501100001" },
      { email: "karate.coach@nawady.demo", name: "Ahmed Hassan", role: "coach", phone: "+966501100002" },
      { email: "karate.staff@nawady.demo", name: "Sara Al-Mutairi", role: "staff", phone: "+966501100003" },
    ],
    members: [
      { name: "Omar Al-Qahtani", phone: "+966551100101", gender: "male", age: 12, portal: true, beltIndex: 2 },
      { name: "Layla Al-Harbi", phone: "+966551100102", gender: "female", age: 10, portal: true, beltIndex: 1 },
      { name: "Youssef Al-Dosari", phone: "+966551100103", gender: "male", age: 14, portal: true, beltIndex: 3 },
      { name: "Noura Al-Shammari", phone: "+966551100104", gender: "female", age: 9, beltIndex: 0 },
      { name: "Khalid Al-Otaibi", phone: "+966551100105", gender: "male", age: 11, beltIndex: 1 },
      { name: "Maha Al-Zahrani", phone: "+966551100106", gender: "female", age: 13, beltIndex: 2 },
    ],
    classTemplates: [
      { name: "Kids Karate", location: "Dojo A", color: "#f59e0b", hour: 16, weekdays: [0, 2, 4] },
      { name: "Adult Kyokushin", location: "Dojo A", color: "#dc2626", hour: 19, weekdays: [1, 3, 5] },
      { name: "Kata Practice", location: "Dojo B", color: "#7c3aed", hour: 18, weekdays: [2, 4] },
    ],
    products: [
      { name: "Karate Gi (Child)", price: 180, stock: 25, category: "Uniforms" },
      { name: "White Belt", price: 25, stock: 50, category: "Belts" },
      { name: "Hand Wraps", price: 35, stock: 40, category: "Equipment" },
    ],
    camp: {
      title: "Summer Karate Intensive",
      description: "Two-week belt preparation camp with daily kata and kumite sessions.",
      daysAhead: 21,
      durationDays: 14,
      price: 1200,
      capacity: 30,
    },
  },
  {
    key: "swimming",
    clubName: "Blue Wave Swimming Club",
    clubType: "swimming",
    location: "Corniche Road, Al Hamra, Jeddah",
    phone: "+966501200001",
    primaryColor: "#0284c7",
    welcomeMessage: "Dive in — learn, train, and compete with Blue Wave.",
    welcomeMessageAr: "مرحباً بكم في نادي الموجة الزرقاء للسباحة",
    staff: [
      { email: "swim.admin@nawady.demo", name: "Hana Al-Ghamdi", role: "admin", phone: "+966501200001" },
      { email: "swim.coach@nawady.demo", name: "Mark Stevens", role: "coach", phone: "+966501200002" },
      { email: "swim.staff@nawady.demo", name: "Reem Al-Johani", role: "staff", phone: "+966501200003" },
    ],
    members: [
      { name: "Adam Al-Farsi", phone: "+966552200101", gender: "male", age: 8, portal: true },
      { name: "Hala Al-Malki", phone: "+966552200102", gender: "female", age: 10, portal: true },
      { name: "Tariq Al-Balawi", phone: "+966552200103", gender: "male", age: 12, portal: true },
      { name: "Dina Al-Qurashi", phone: "+966552200104", gender: "female", age: 7 },
      { name: "Fahad Al-Harthi", phone: "+966552200105", gender: "male", age: 9 },
      { name: "Rania Al-Shehri", phone: "+966552200106", gender: "female", age: 11 },
    ],
    classTemplates: [
      { name: "Learn to Swim", location: "Pool Lane 1-2", color: "#06b6d4", hour: 10, weekdays: [0, 1, 2, 3, 4] },
      { name: "Competitive Squad", location: "Pool Lane 5-6", color: "#0284c7", hour: 17, weekdays: [1, 3, 5] },
      { name: "Adult Lap Swimming", location: "Pool Lane 7", color: "#0ea5e9", hour: 20, weekdays: [2, 4, 6] },
    ],
    products: [
      { name: "Swim Goggles", price: 65, stock: 30, category: "Equipment" },
      { name: "Silicone Swim Cap", price: 30, stock: 45, category: "Equipment" },
      { name: "Club Towel", price: 55, stock: 20, category: "Merchandise" },
    ],
    camp: {
      title: "Holiday Swim Camp",
      description: "Morning sessions covering freestyle, backstroke, and water safety.",
      daysAhead: 14,
      durationDays: 5,
      price: 450,
      capacity: 20,
    },
  },
  {
    key: "football",
    clubName: "Victory FC Academy",
    clubType: "football",
    location: "Prince Mohammed bin Fahd Road, Dammam",
    phone: "+966501300001",
    primaryColor: "#16a34a",
    welcomeMessage: "Train hard. Play smart. Win together.",
    welcomeMessageAr: "مرحباً بكم في أكاديمية فيكتوري لكرة القدم",
    staff: [
      { email: "football.admin@nawady.demo", name: "Nasser Al-Dossary", role: "admin", phone: "+966501300001" },
      { email: "football.coach@nawady.demo", name: "Carlos Mendez", role: "coach", phone: "+966501300002" },
      { email: "football.staff@nawady.demo", name: "Fatima Al-Anzi", role: "staff", phone: "+966501300003" },
    ],
    members: [
      { name: "Hamza Al-Enezi", phone: "+966553300101", gender: "male", age: 11, portal: true },
      { name: "Zain Al-Mansouri", phone: "+966553300102", gender: "male", age: 13, portal: true },
      { name: "Lina Al-Khalifa", phone: "+966553300103", gender: "female", age: 12, portal: true },
      { name: "Saeed Al-Ruwaili", phone: "+966553300104", gender: "male", age: 10 },
      { name: "Mariam Al-Sabti", phone: "+966553300105", gender: "female", age: 9 },
      { name: "Badr Al-Hajri", phone: "+966553300106", gender: "male", age: 14 },
    ],
    classTemplates: [
      { name: "U10 Skills", location: "Pitch 2", color: "#22c55e", hour: 16, weekdays: [0, 2, 4] },
      { name: "U14 Tactical", location: "Pitch 1", color: "#16a34a", hour: 18, weekdays: [1, 3, 5] },
      { name: "Goalkeeper Training", location: "Pitch 3", color: "#15803d", hour: 17, weekdays: [2, 5] },
    ],
    products: [
      { name: "Training Jersey", price: 120, stock: 35, category: "Uniforms" },
      { name: "Football (Size 4)", price: 85, stock: 15, category: "Equipment" },
      { name: "Shin Guards", price: 45, stock: 40, category: "Equipment" },
    ],
    camp: {
      title: "Pre-Season Football Camp",
      description: "Intensive drills, small-sided games, and fitness testing.",
      daysAhead: 28,
      durationDays: 7,
      price: 800,
      capacity: 40,
    },
  },
  {
    key: "gymnastics",
    clubName: "Flex Gymnastics Center",
    clubType: "gymnastics",
    location: "King Abdullah Road, Al Khobar",
    phone: "+966501400001",
    primaryColor: "#a855f7",
    welcomeMessage: "Balance, strength, and artistry — welcome to Flex.",
    welcomeMessageAr: "مرحباً بكم في مركز فليكس للجمباز",
    staff: [
      { email: "gym.admin@nawady.demo", name: "Lina Al-Kooheji", role: "admin", phone: "+966501400001" },
      { email: "gym.coach@nawady.demo", name: "Elena Popova", role: "coach", phone: "+966501400002" },
      { email: "gym.staff@nawady.demo", name: "Jassim Al-Buainain", role: "staff", phone: "+966501400003" },
    ],
    members: [
      { name: "Aisha Al-Mahmoud", phone: "+966554400101", gender: "female", age: 8, portal: true },
      { name: "Leen Al-Fadhel", phone: "+966554400102", gender: "female", age: 10, portal: true },
      { name: "Yara Al-Sadoun", phone: "+966554400103", gender: "female", age: 12, portal: true },
      { name: "Hassan Al-Najjar", phone: "+966554400104", gender: "male", age: 7 },
      { name: "Sama Al-Rashed", phone: "+966554400105", gender: "female", age: 9 },
      { name: "Rayan Al-Mousa", phone: "+966554400106", gender: "male", age: 11 },
    ],
    classTemplates: [
      { name: "Recreational Gym", location: "Floor Area", color: "#c084fc", hour: 15, weekdays: [0, 1, 2, 3, 4] },
      { name: "Competitive WAG", location: "Apparatus Hall", color: "#a855f7", hour: 17, weekdays: [1, 3, 5] },
      { name: "Tumbling & Trampoline", location: "Trampoline Zone", color: "#7c3aed", hour: 18, weekdays: [2, 4] },
    ],
    products: [
      { name: "Leotard (Child)", price: 150, stock: 20, category: "Uniforms" },
      { name: "Grip Bag", price: 40, stock: 25, category: "Equipment" },
      { name: "Hair Ties Pack", price: 15, stock: 60, category: "Accessories" },
    ],
    camp: {
      title: "Spring Gymnastics Camp",
      description: "Floor, beam, bars, and vault fundamentals for all levels.",
      daysAhead: 18,
      durationDays: 4,
      price: 550,
      capacity: 24,
    },
  },
  {
    key: "parkour",
    clubName: "Urban Flow Parkour",
    clubType: "parkour",
    location: "Industrial District, Riyadh",
    phone: "+966501500001",
    primaryColor: "#ea580c",
    welcomeMessage: "Move freely. Train safely. Flow with Urban Flow.",
    welcomeMessageAr: "مرحباً بكم في أوربان فلو للباركور",
    staff: [
      { email: "parkour.admin@nawady.demo", name: "Rayan Al-Sudairi", role: "admin", phone: "+966501500001" },
      { email: "parkour.coach@nawady.demo", name: "James Cole", role: "coach", phone: "+966501500002" },
      { email: "parkour.staff@nawady.demo", name: "Noor Al-Qasimi", role: "staff", phone: "+966501500003" },
    ],
    members: [
      { name: "Faris Al-Hazmi", phone: "+966555500101", gender: "male", age: 15, portal: true },
      { name: "Jana Al-Mutawa", phone: "+966555500102", gender: "female", age: 14, portal: true },
      { name: "Waleed Al-Shahrani", phone: "+966555500103", gender: "male", age: 16, portal: true },
      { name: "Hind Al-Bishi", phone: "+966555500104", gender: "female", age: 13 },
      { name: "Talal Al-Ghamdi", phone: "+966555500105", gender: "male", age: 12 },
      { name: "Raghad Al-Omari", phone: "+966555500106", gender: "female", age: 15 },
    ],
    classTemplates: [
      { name: "Beginner Flow", location: "Main Hall", color: "#fb923c", hour: 17, weekdays: [0, 2, 4] },
      { name: "Advanced Parkour", location: "Obstacle Course", color: "#ea580c", hour: 19, weekdays: [1, 3, 5] },
      { name: "Strength & Conditioning", location: "Gym Zone", color: "#c2410c", hour: 18, weekdays: [2, 4, 6] },
    ],
    products: [
      { name: "Parkour Shoes", price: 320, stock: 12, category: "Footwear" },
      { name: "Wrist Wraps", price: 40, stock: 30, category: "Equipment" },
      { name: "Club Hoodie", price: 140, stock: 18, category: "Merchandise" },
    ],
    camp: {
      title: "Parkour Foundations Weekend",
      description: "Safety rolls, vaults, precision jumps, and flow combinations.",
      daysAhead: 10,
      durationDays: 2,
      price: 350,
      capacity: 16,
    },
  },
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function memberAvatar(name: string, seed: string): string {
  const bg = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"][seed.length % 5];
  return `https://api.dicebear.com/7.x/shapes/png?seed=${encodeURIComponent(name)}&backgroundColor=${bg}`;
}

function logoUrl(clubType: string): string {
  return `/club-types/${clubType}.png`;
}

async function demoTenantExists(adminEmail: string): Promise<string | null> {
  const r = await query(
    `SELECT t.id FROM tenants t
     INNER JOIN users u ON u.tenant_id = t.id AND u.email = $1`,
    [adminEmail],
  );
  return (r.rows[0]?.id as string) ?? null;
}

async function deleteDemoTenants(): Promise<void> {
  const emails = DEMO_CLUBS.flatMap((c) => c.staff.map((s) => s.email));
  const tenants = await query(
    `SELECT DISTINCT t.id, t.name FROM tenants t
     INNER JOIN users u ON u.tenant_id = t.id
     WHERE u.email = ANY($1)`,
    [emails],
  );
  for (const row of tenants.rows) {
    console.log(`  Removing demo tenant: ${row.name}`);
    await query("DELETE FROM tenants WHERE id = $1", [row.id]);
  }
}

async function seedClub(def: ClubDef): Promise<void> {
  const admin = def.staff.find((s) => s.role === "admin")!;
  const existingId = await demoTenantExists(admin.email);
  if (existingId) {
    console.log(`  Skip ${def.clubName} (already seeded)`);
    return;
  }

  console.log(`  Seeding ${def.clubName}...`);

  const { tenant, user: adminUser } = await data.provisionTenant({
    clubName: def.clubName,
    email: admin.email,
    password: DEMO_PASSWORD,
    adminName: admin.name,
    phone: def.phone,
    clubType: def.clubType,
    planSlug: "starter",
  });
  const tenantId = tenant.id as string;

  await data.updateSettings(tenantId, {
    name: def.clubName,
    phone: def.phone,
    location: def.location,
    logoUrlLight: logoUrl(def.clubType),
    logoUrlDark: logoUrl(def.clubType),
    managerEmail: admin.email,
    socials: {
      instagram: `@${def.key}_nawady`,
      twitter: `@${def.key}club`,
      website: `https://nawady.app/clubs/${tenant.slug}`,
    },
    productCategories: ["Uniforms", "Equipment", "Merchandise", "Accessories", "Belts", "Footwear"],
  });

  await bookings.updateBookingSettings(tenantId, {
    portalEnabled: true,
    appDirectoryEnabled: true,
    portalPrimaryColor: def.primaryColor,
    portalWelcomeMessage: def.welcomeMessage,
    publicSlug: tenant.slug as string,
    bookingWindowDays: 14,
    allowWaitlist: true,
  });

  const userIds: Record<string, string> = { admin: adminUser.id as string };
  for (const staff of def.staff) {
    if (staff.role === "admin") continue;
    const u = await data.createUser(tenantId, staff.email, DEMO_PASSWORD, staff.name, staff.role);
    userIds[staff.role] = u.id as string;
  }

  const coachStaff = def.staff.find((s) => s.role === "coach")!;
  const coach = await data.createCoach(tenantId, {
    userId: userIds.coach,
    name: coachStaff.name,
    phone: coachStaff.phone,
    email: coachStaff.email,
    bio: `Head coach at ${def.clubName} with 10+ years of experience.`,
    isActive: true,
  });
  const coachId = coach.id as string;

  const packages = await data.getPackages(tenantId);
  const defaultPkg = packages[0] as { name: string; price: number; packageType: string; sessionCount?: number };
  const sessionPkg = packages.find((p) => (p as { packageType: string }).packageType === "sessions") as
    | { name: string; price: number; packageType: string; sessionCount?: number }
    | undefined;

  const today = new Date();
  const subStart = formatDate(today);
  const subEnd = formatDate(addDays(today, 90));

  const memberRecords: { id: string; name: string; def: MemberDef }[] = [];
  for (const m of def.members) {
    const member = await data.createMember(tenantId, {
      name: m.name,
      phone: m.phone,
      email: m.email || `${m.name.toLowerCase().replace(/\s+/g, ".")}@member.demo`,
      gender: m.gender,
      age: m.age,
      status: "active",
      imageUrl: memberAvatar(m.name, def.key),
      subscriptionStart: subStart,
      subscriptionEnd: subEnd,
    });
    const memberId = member.id as string;
    memberRecords.push({ id: memberId, name: m.name, def: m });

    const pkg = m.portal && sessionPkg ? sessionPkg : defaultPkg;
    await data.createSubscription(tenantId, {
      memberId,
      memberName: m.name,
      planName: pkg.name,
      amount: pkg.price,
      startDate: subStart,
      endDate: subEnd,
      status: "active",
      paymentStatus: "paid",
      paymentMethod: "cash",
      packageType: pkg.packageType || "duration",
      sessionsTotal: pkg.sessionCount || null,
      sessionsRemaining: pkg.sessionCount || null,
    });

    if (m.portal) {
      await data.enableMemberPortalAccess(tenantId, memberId, MEMBER_PORTAL_PASSWORD);
    }
  }

  const belts = await data.getBelts(tenantId);
  for (const rec of memberRecords) {
    if (rec.def.beltIndex != null && belts[rec.def.beltIndex]) {
      const belt = belts[rec.def.beltIndex] as { id: string };
      await data.awardBeltToMember(tenantId, {
        memberId: rec.id,
        beltId: belt.id,
        stripes: rec.def.beltIndex % 3,
        awardedAt: addDays(today, -30 - rec.def.beltIndex * 10).toISOString(),
      });
    }
  }

  const templateIds: string[] = [];
  for (const tpl of def.classTemplates) {
    const template = await data.createClassTemplate(tenantId, {
      name: tpl.name,
      description: `${tpl.name} at ${def.clubName}`,
      coachId,
      location: tpl.location,
      capacity: 20,
      durationMinutes: 60,
      color: tpl.color,
      recurrence: tpl.weekdays.map((d) => ({ dayOfWeek: d, time: `${String(tpl.hour).padStart(2, "0")}:00` })),
      isActive: true,
      deductSession: false,
    });
    templateIds.push(template.id as string);
  }

  const sessionIds: string[] = [];
  for (let day = 1; day <= 14; day++) {
    const date = addDays(today, day);
    const dow = date.getDay();
    for (let i = 0; i < def.classTemplates.length; i++) {
      const tpl = def.classTemplates[i];
      if (!tpl.weekdays.includes(dow)) continue;
      const starts = new Date(date);
      starts.setHours(tpl.hour, 0, 0, 0);
      const ends = new Date(starts);
      ends.setMinutes(ends.getMinutes() + 60);
      const session = await data.createClassSession(tenantId, {
        templateId: templateIds[i],
        name: tpl.name,
        coachId,
        location: tpl.location,
        startsAt: starts.toISOString(),
        endsAt: ends.toISOString(),
        capacity: 20,
        status: "scheduled",
      });
      sessionIds.push(session.id as string);
    }
  }

  for (let i = 0; i < Math.min(4, memberRecords.length, sessionIds.length); i++) {
    try {
      await bookings.createBooking({
        tenantId,
        sessionId: sessionIds[i],
        memberId: memberRecords[i].id,
        memberName: memberRecords[i].name,
        bookedBy: "staff",
      });
    } catch {
      /* skip if validation fails */
    }
  }

  for (let i = 0; i < Math.min(3, memberRecords.length); i++) {
    const rec = memberRecords[i];
    for (let d = 1; d <= 5; d++) {
      const attDate = formatDate(addDays(today, -d * 2));
      await data.createAttendance(tenantId, {
        memberId: rec.id,
        memberName: rec.name,
        date: attDate,
        checkIn: `${attDate}T${String(def.classTemplates[0].hour).padStart(2, "0")}:05:00`,
        checkOut: `${attDate}T${String(def.classTemplates[0].hour + 1).padStart(2, "0")}:00:00`,
      });
    }
  }

  const productIds: string[] = [];
  for (const p of def.products) {
    const product = await data.createProduct(tenantId, {
      name: p.name,
      description: `${p.name} — official ${def.clubName} gear`,
      price: p.price,
      stock: p.stock,
      category: p.category,
      imageUrl: logoUrl(def.clubType),
      trackInventory: true,
    });
    productIds.push(product.id as string);
  }

  if (productIds[0] && memberRecords[0]) {
    const p = def.products[0];
    await data.createSale(tenantId, {
      productId: productIds[0],
      productName: p.name,
      quantity: 1,
      unitPrice: p.price,
      totalPrice: p.price,
      memberId: memberRecords[0].id,
      buyerName: memberRecords[0].name,
      buyerPhone: memberRecords[0].def.phone,
      paymentMethod: "card",
      paymentStatus: "paid",
    });
  }

  await data.createExpense(tenantId, {
    description: "Monthly facility rent",
    amount: 8500,
    category: "Rent",
    date: formatDate(addDays(today, -5)),
    expensesTitle: "Facility",
  });
  await data.createExpense(tenantId, {
    description: "Equipment maintenance",
    amount: 1200,
    category: "Operations",
    date: formatDate(addDays(today, -12)),
    expensesTitle: "Maintenance",
  });

  const campStart = addDays(today, def.camp.daysAhead);
  campStart.setHours(9, 0, 0, 0);
  const campEnd = addDays(campStart, def.camp.durationDays);
  campEnd.setHours(17, 0, 0, 0);
  const camp = await createCamp(tenantId, userIds.admin, {
    title: def.camp.title,
    description: def.camp.description,
    startDate: campStart.toISOString(),
    endDate: campEnd.toISOString(),
    eventType: "camp",
    capacity: def.camp.capacity,
    price: def.camp.price,
    isPublic: true,
    color: def.primaryColor,
  });

  for (let i = 0; i < Math.min(3, memberRecords.length); i++) {
    await registerForCamp(tenantId, camp.id as string, {
      memberId: memberRecords[i].id,
      memberName: memberRecords[i].name,
      phone: memberRecords[i].def.phone,
    });
  }

  console.log(`    ✓ ${def.clubName} (${tenant.slug}) — ${def.staff.length} staff, ${def.members.length} members`);
}

function printCredentials(): void {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Nawady demo seed complete");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\n  Staff password (all clubs):  ${DEMO_PASSWORD}`);
  console.log(`  Member portal password:      ${MEMBER_PORTAL_PASSWORD}`);
  console.log("\n  Clubs & staff logins:\n");
  for (const club of DEMO_CLUBS) {
    console.log(`  ${club.clubName} (${club.clubType})`);
    for (const s of club.staff) {
      console.log(`    ${s.role.padEnd(6)} ${s.email}`);
    }
    const portalMembers = club.members.filter((m) => m.portal);
    if (portalMembers.length) {
      console.log("    Members (portal):");
      for (const m of portalMembers) {
        console.log(`      ${m.name} — ${m.phone}`);
      }
    }
    console.log("");
  }
  console.log("  Discover: GET /api/clubs");
  console.log("  Re-seed:  SEED_RESET=true npm run db:seed");
  console.log("═══════════════════════════════════════════════════════════\n");
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("Seeding Nawady demo data...\n");

  if (process.env.SEED_RESET === "true") {
    console.log("SEED_RESET=true — removing existing demo tenants...");
    await deleteDemoTenants();
  }

  for (const club of DEMO_CLUBS) {
    await seedClub(club);
  }

  printCredentials();
}

main()
  .catch((err) => {
    console.error("Seed failed:", err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
