export type ClubTypeId =
  | "karate"
  | "taekwondo"
  | "judo"
  | "bjj"
  | "aikido"
  | "muay_thai"
  | "boxing"
  | "mma"
  | "wrestling"
  | "krav_maga"
  | "kung_fu"
  | "capoeira"
  | "general_gym"
  | "crossfit"
  | "yoga_pilates"
  | "parkour"
  | "climbing"
  | "hybrid";

export type ProgressionMode = "belts" | "levels" | "ranks" | "badges" | "none";
export type PackageType = "duration" | "sessions";

export interface ProgressionConfig {
  enabled: boolean;
  mode: ProgressionMode;
  label: string;
  labelAr: string;
  singularLabel: string;
  singularLabelAr: string;
  showStripes: boolean;
  maxStripes?: number;
}

export interface ModuleConfig {
  progression: boolean;
  store: boolean;
  belts: boolean;
}

export interface CustomFieldDef {
  key: string;
  label: string;
  labelAr: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
  required?: boolean;
}

export interface MemberFieldConfig {
  beltSize: boolean;
  suitSize: boolean;
  weight: boolean;
  height: boolean;
  bloodType: boolean;
  healthNotes: boolean;
  customFields: CustomFieldDef[];
}

export interface DefaultBelt {
  name: string;
  color: string;
  order: number;
}

export interface DefaultPackage {
  name: string;
  packageType: PackageType;
  duration: number;
  sessionCount?: number;
  price: number;
}

export interface ClubTypeTemplate {
  id: ClubTypeId;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: "martial_arts" | "fitness" | "specialty" | "hybrid";
  progressionConfig: ProgressionConfig;
  moduleConfig: ModuleConfig;
  memberFieldConfig: MemberFieldConfig;
  defaultBelts?: DefaultBelt[];
  defaultPackages: DefaultPackage[];
}

export const DEFAULT_PROGRESSION: ProgressionConfig = {
  enabled: true,
  mode: "belts",
  label: "Belts",
  labelAr: "الأحزمة",
  singularLabel: "Belt",
  singularLabelAr: "حزام",
  showStripes: false,
};

export const DEFAULT_MODULES: ModuleConfig = {
  progression: true,
  store: true,
  belts: true,
};

export const DEFAULT_MEMBER_FIELDS: MemberFieldConfig = {
  beltSize: true,
  suitSize: true,
  weight: true,
  height: true,
  bloodType: true,
  healthNotes: true,
  customFields: [],
};

const KARATE_BELTS: DefaultBelt[] = [
  { name: "White", color: "#FFFFFF", order: 1 },
  { name: "Yellow", color: "#FACC15", order: 2 },
  { name: "Orange", color: "#F97316", order: 3 },
  { name: "Green", color: "#22C55E", order: 4 },
  { name: "Blue", color: "#3B82F6", order: 5 },
  { name: "Brown", color: "#92400E", order: 6 },
  { name: "Black", color: "#111827", order: 7 },
];

const BJJ_BELTS: DefaultBelt[] = [
  { name: "White", color: "#FFFFFF", order: 1 },
  { name: "Blue", color: "#2563EB", order: 2 },
  { name: "Purple", color: "#7C3AED", order: 3 },
  { name: "Brown", color: "#92400E", order: 4 },
  { name: "Black", color: "#111827", order: 5 },
];

const MONTHLY_PACKAGES: DefaultPackage[] = [
  { name: "Monthly", packageType: "duration", duration: 30, price: 50 },
  { name: "Quarterly", packageType: "duration", duration: 90, price: 130 },
  { name: "Annual", packageType: "duration", duration: 365, price: 480 },
];

const SESSION_PACKAGES: DefaultPackage[] = [
  { name: "10 Class Pack", packageType: "sessions", duration: 90, sessionCount: 10, price: 80 },
  { name: "Monthly Unlimited", packageType: "duration", duration: 30, price: 99 },
];

const STRIKING_LEVELS: DefaultBelt[] = [
  { name: "Beginner", color: "#94A3B8", order: 1 },
  { name: "Intermediate", color: "#3B82F6", order: 2 },
  { name: "Advanced", color: "#8B5CF6", order: 3 },
  { name: "Fighter", color: "#DC2626", order: 4 },
];

const KRAV_LEVELS: DefaultBelt[] = [
  { name: "P1", color: "#FACC15", order: 1 },
  { name: "P2", color: "#F97316", order: 2 },
  { name: "P3", color: "#22C55E", order: 3 },
  { name: "P4", color: "#3B82F6", order: 4 },
  { name: "P5", color: "#7C3AED", order: 5 },
  { name: "G1", color: "#92400E", order: 6 },
  { name: "G2", color: "#111827", order: 7 },
];

const PARKOUR_SKILLS: DefaultBelt[] = [
  { name: "Foundation", color: "#94A3B8", order: 1 },
  { name: "Flow", color: "#22C55E", order: 2 },
  { name: "Precision", color: "#3B82F6", order: 3 },
  { name: "Advanced", color: "#7C3AED", order: 4 },
];

export const CLUB_TYPE_TEMPLATES: ClubTypeTemplate[] = [
  {
    id: "karate",
    nameEn: "Karate",
    nameAr: "كاراتيه",
    descriptionEn: "Traditional belt progression with gi sizing",
    descriptionAr: "تدرج أحزمة تقليدي مع مقاسات الزي",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "belts" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: { ...DEFAULT_MEMBER_FIELDS },
    defaultBelts: KARATE_BELTS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "taekwondo",
    nameEn: "Taekwondo",
    nameAr: "تايكوندو",
    descriptionEn: "Belt system with competition tracking",
    descriptionAr: "نظام أحزمة مع تتبع المسابقات",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "belts" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: {
      ...DEFAULT_MEMBER_FIELDS,
      customFields: [{ key: "weightClass", label: "Weight Class", labelAr: "فئة الوزن", type: "text" }],
    },
    defaultBelts: KARATE_BELTS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "judo",
    nameEn: "Judo",
    nameAr: "جودو",
    descriptionEn: "Kyu/dan ranks with weight class",
    descriptionAr: "درجات كيو/دان مع فئة الوزن",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "ranks", label: "Ranks", labelAr: "الدرجات", singularLabel: "Rank", singularLabelAr: "درجة" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: {
      ...DEFAULT_MEMBER_FIELDS,
      customFields: [{ key: "weightClass", label: "Weight Class", labelAr: "فئة الوزن", type: "text" }],
    },
    defaultBelts: KARATE_BELTS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "bjj",
    nameEn: "Brazilian Jiu-Jitsu",
    nameAr: "جيو جيتسو برازيلي",
    descriptionEn: "Belt progression with stripes",
    descriptionAr: "تدرج أحزمة مع خطوط",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "belts", showStripes: true, maxStripes: 4 },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: { ...DEFAULT_MEMBER_FIELDS, suitSize: true, beltSize: true },
    defaultBelts: BJJ_BELTS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "aikido",
    nameEn: "Aikido",
    nameAr: "أيكيدو",
    descriptionEn: "Kyu/dan rank progression",
    descriptionAr: "تدرج درجات كيو/دان",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "ranks", label: "Ranks", labelAr: "الدرجات", singularLabel: "Rank", singularLabelAr: "درجة" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: DEFAULT_MEMBER_FIELDS,
    defaultBelts: KARATE_BELTS.slice(0, 6),
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "muay_thai",
    nameEn: "Muay Thai",
    nameAr: "مواي تاي",
    descriptionEn: "Skill levels and fight record",
    descriptionAr: "مستويات مهارة وسجل قتال",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "levels", label: "Levels", labelAr: "المستويات", singularLabel: "Level", singularLabelAr: "مستوى" },
    moduleConfig: { ...DEFAULT_MODULES },
    memberFieldConfig: {
      beltSize: false,
      suitSize: false,
      weight: true,
      height: true,
      bloodType: true,
      healthNotes: true,
      customFields: [
        { key: "weightClass", label: "Weight Class", labelAr: "فئة الوزن", type: "text" },
        { key: "fightRecord", label: "Fight Record (W-L-D)", labelAr: "سجل القتال", type: "text" },
        { key: "medicalExpiry", label: "Medical Clearance Expiry", labelAr: "انتهاء الفحص الطبي", type: "date" },
      ],
    },
    defaultBelts: STRIKING_LEVELS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "boxing",
    nameEn: "Boxing",
    nameAr: "ملاكمة",
    descriptionEn: "Gym tiers without belt system",
    descriptionAr: "مستويات بدون نظام أحزمة",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "levels", label: "Levels", labelAr: "المستويات", singularLabel: "Level", singularLabelAr: "مستوى" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: {
      beltSize: false,
      suitSize: false,
      weight: true,
      height: true,
      bloodType: true,
      healthNotes: true,
      customFields: [
        { key: "weightClass", label: "Weight Class", labelAr: "فئة الوزن", type: "text" },
        { key: "sparringClearance", label: "Sparring Clearance", labelAr: "تصريح المبارزة", type: "select", options: ["none", "approved", "competition"] },
        { key: "medicalExpiry", label: "Medical Clearance Expiry", labelAr: "انتهاء الفحص الطبي", type: "date" },
      ],
    },
    defaultBelts: STRIKING_LEVELS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "mma",
    nameEn: "MMA",
    nameAr: "فنون قتالية مختلطة",
    descriptionEn: "Multi-discipline levels, optional BJJ track",
    descriptionAr: "مستويات متعددة التخصصات",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "levels", label: "Levels", labelAr: "المستويات", singularLabel: "Level", singularLabelAr: "مستوى" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: {
      beltSize: false,
      suitSize: false,
      weight: true,
      height: true,
      bloodType: true,
      healthNotes: true,
      customFields: [
        { key: "weightClass", label: "Weight Class", labelAr: "فئة الوزن", type: "text" },
        { key: "disciplines", label: "Disciplines", labelAr: "التخصصات", type: "text" },
        { key: "medicalExpiry", label: "Medical Clearance Expiry", labelAr: "انتهاء الفحص الطبي", type: "date" },
      ],
    },
    defaultBelts: STRIKING_LEVELS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "wrestling",
    nameEn: "Wrestling",
    nameAr: "مصارعة",
    descriptionEn: "Experience levels and weight class",
    descriptionAr: "مستويات خبرة وفئة وزن",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "levels", label: "Levels", labelAr: "المستويات", singularLabel: "Level", singularLabelAr: "مستوى" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: {
      beltSize: false,
      suitSize: false,
      weight: true,
      height: true,
      bloodType: false,
      healthNotes: true,
      customFields: [{ key: "weightClass", label: "Weight Class", labelAr: "فئة الوزن", type: "text" }],
    },
    defaultBelts: STRIKING_LEVELS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "krav_maga",
    nameEn: "Krav Maga",
    nameAr: "كراف ماغا",
    descriptionEn: "P/G/E level progression",
    descriptionAr: "تدرج مستويات P/G/E",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "levels", label: "Levels", labelAr: "المستويات", singularLabel: "Level", singularLabelAr: "مستوى" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: { beltSize: false, suitSize: false, weight: true, height: true, bloodType: true, healthNotes: true, customFields: [] },
    defaultBelts: KRAV_LEVELS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "kung_fu",
    nameEn: "Kung Fu / Wushu",
    nameAr: "كونغ فو / ووشو",
    descriptionEn: "Sash/belt progression",
    descriptionAr: "تدرج أحزمة/أوشحة",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "belts", label: "Sashes", labelAr: "الأوشحة", singularLabel: "Sash", singularLabelAr: "وشاح" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: DEFAULT_MEMBER_FIELDS,
    defaultBelts: KARATE_BELTS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "capoeira",
    nameEn: "Capoeira",
    nameAr: "كابويرا",
    descriptionEn: "Cordão color progression",
    descriptionAr: "تدرج ألوان الكورداو",
    category: "martial_arts",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "belts", label: "Cordões", labelAr: "الكورداو", singularLabel: "Cordão", singularLabelAr: "كورداو" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: { ...DEFAULT_MEMBER_FIELDS, suitSize: true, beltSize: false },
    defaultBelts: KARATE_BELTS,
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "general_gym",
    nameEn: "General Gym",
    nameAr: "نادي رياضي عام",
    descriptionEn: "Membership and access — no progression",
    descriptionAr: "عضوية ودخول بدون تدرج",
    category: "fitness",
    progressionConfig: { ...DEFAULT_PROGRESSION, enabled: false, mode: "none" },
    moduleConfig: { progression: false, store: true, belts: false },
    memberFieldConfig: { beltSize: false, suitSize: false, weight: true, height: true, bloodType: false, healthNotes: true, customFields: [] },
    defaultPackages: MONTHLY_PACKAGES,
  },
  {
    id: "crossfit",
    nameEn: "CrossFit / HIIT",
    nameAr: "كروس فيت / تمارين عالية الكثافة",
    descriptionEn: "Class packs and unlimited memberships",
    descriptionAr: "باقات حصص وعضويات غير محدودة",
    category: "fitness",
    progressionConfig: { ...DEFAULT_PROGRESSION, enabled: false, mode: "none" },
    moduleConfig: { progression: false, store: true, belts: false },
    memberFieldConfig: { beltSize: false, suitSize: false, weight: true, height: true, bloodType: false, healthNotes: true, customFields: [] },
    defaultPackages: SESSION_PACKAGES,
  },
  {
    id: "yoga_pilates",
    nameEn: "Yoga / Pilates",
    nameAr: "يوغا / بيلاتس",
    descriptionEn: "Class-based session packs",
    descriptionAr: "باقات حصص",
    category: "fitness",
    progressionConfig: { ...DEFAULT_PROGRESSION, enabled: false, mode: "none" },
    moduleConfig: { progression: false, store: true, belts: false },
    memberFieldConfig: { beltSize: false, suitSize: false, weight: false, height: false, bloodType: false, healthNotes: true, customFields: [] },
    defaultPackages: SESSION_PACKAGES,
  },
  {
    id: "parkour",
    nameEn: "Parkour / Freerunning",
    nameAr: "باركور",
    descriptionEn: "Skill tree progression",
    descriptionAr: "تدرج مهارات",
    category: "specialty",
    progressionConfig: { ...DEFAULT_PROGRESSION, mode: "badges", label: "Skills", labelAr: "المهارات", singularLabel: "Skill", singularLabelAr: "مهارة" },
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: {
      beltSize: false,
      suitSize: false,
      weight: false,
      height: true,
      bloodType: false,
      healthNotes: true,
      customFields: [{ key: "emergencyContact", label: "Emergency Contact", labelAr: "جهة اتصال طوارئ", type: "text", required: true }],
    },
    defaultBelts: PARKOUR_SKILLS,
    defaultPackages: [...SESSION_PACKAGES, ...MONTHLY_PACKAGES.slice(0, 1)],
  },
  {
    id: "climbing",
    nameEn: "Climbing Gym",
    nameAr: "نادي تسلق",
    descriptionEn: "Membership with belay certification",
    descriptionAr: "عضوية مع شهادة تأمين",
    category: "specialty",
    progressionConfig: { ...DEFAULT_PROGRESSION, enabled: false, mode: "none" },
    moduleConfig: { progression: false, store: true, belts: false },
    memberFieldConfig: {
      beltSize: false,
      suitSize: false,
      weight: true,
      height: true,
      bloodType: false,
      healthNotes: true,
      customFields: [
        { key: "belayCertified", label: "Belay Certified", labelAr: "شهادة تأمين", type: "select", options: ["no", "yes"] },
        { key: "belayCertExpiry", label: "Belay Cert Expiry", labelAr: "انتهاء شهادة التأمين", type: "date" },
      ],
    },
    defaultPackages: [
      { name: "Day Pass", packageType: "duration", duration: 1, price: 15 },
      ...MONTHLY_PACKAGES,
    ],
  },
  {
    id: "hybrid",
    nameEn: "Hybrid / Multi-discipline",
    nameAr: "مختلط / متعدد التخصصات",
    descriptionEn: "Flexible setup for mixed martial arts and fitness",
    descriptionAr: "إعداد مرن للفنون القتالية واللياقة",
    category: "hybrid",
    progressionConfig: DEFAULT_PROGRESSION,
    moduleConfig: DEFAULT_MODULES,
    memberFieldConfig: DEFAULT_MEMBER_FIELDS,
    defaultBelts: KARATE_BELTS,
    defaultPackages: MONTHLY_PACKAGES,
  },
];

export function getClubTypeTemplate(id: string): ClubTypeTemplate {
  return CLUB_TYPE_TEMPLATES.find((t) => t.id === id) ?? CLUB_TYPE_TEMPLATES.find((t) => t.id === "hybrid")!;
}

export function getAllClubTypes(): ClubTypeTemplate[] {
  return CLUB_TYPE_TEMPLATES;
}

export function parseProgressionConfig(raw: unknown): ProgressionConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_PROGRESSION;
  return { ...DEFAULT_PROGRESSION, ...(raw as ProgressionConfig) };
}

export function parseModuleConfig(raw: unknown): ModuleConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_MODULES;
  return { ...DEFAULT_MODULES, ...(raw as ModuleConfig) };
}

export function parseMemberFieldConfig(raw: unknown): MemberFieldConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_MEMBER_FIELDS;
  const r = raw as Partial<MemberFieldConfig>;
  return {
    ...DEFAULT_MEMBER_FIELDS,
    ...r,
    customFields: r.customFields ?? DEFAULT_MEMBER_FIELDS.customFields,
  };
}
