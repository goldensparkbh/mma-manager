import * as dotenv from "dotenv";
import { existsSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

dotenv.config({ path: ".env.local" });
dotenv.config();

const FIREBASE_CLI_CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const FIREBASE_CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const DEFAULT_SEED_TAG = "demo-en-v1";

type PaymentStatus = "paid" | "pending" | "unpaid";
type PaymentMethod = "cash" | "card" | "transfer";

type SeedSubscriptionPlan = {
  planName: string;
  amount: number;
  startOffsetDays: number;
  durationDays: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
};

type MemberSeed = {
  id: string;
  memberId: string;
  firstName: string;
  fatherName: string;
  lastName: string;
  phone: string;
  email: string;
  dob: string;
  gender: "male" | "female";
  age: number;
  height: string;
  weight: string;
  bloodType: string;
  beltSize: string;
  suitSize: string;
  healthNotes: string;
  baseBalance: number;
  imageSources: string[];
  subscription?: SeedSubscriptionPlan;
};

type ProductSeed = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  trackInventory: boolean;
  imageSources: string[];
};

type RoleSeed = {
  id: string;
  name: string;
  permissions: string[];
};

type WriteDoc = {
  path: string;
  data: Record<string, unknown>;
  merge?: boolean;
};

type CliOptions = {
  projectId?: string;
  bucket?: string;
  seedTag: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    seedTag: DEFAULT_SEED_TAG,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project" && argv[i + 1]) {
      options.projectId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--bucket" && argv[i + 1]) {
      options.bucket = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--tag" && argv[i + 1]) {
      options.seedTag = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
  }

  return options;
}

async function readDefaultProjectIdFromFirebaseRc(): Promise<string | null> {
  const filePath = path.resolve(".firebaserc");
  if (!existsSync(filePath)) return null;

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as {
      projects?: { default?: string };
    };
    return parsed.projects?.default ?? null;
  } catch (error) {
    console.warn("Failed to parse .firebaserc:", error);
    return null;
  }
}

async function getFirebaseCliCredentialFile(): Promise<string> {
  const configPath = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    ".config",
    "configstore",
    "firebase-tools.json",
  );

  if (!existsSync(configPath)) {
    throw new Error(
      "Firebase CLI credentials not found. Run `firebase login` or configure a service account.",
    );
  }

  const raw = await readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as {
    tokens?: { refresh_token?: string };
  };
  const refreshToken = parsed.tokens?.refresh_token;

  if (!refreshToken) {
    throw new Error(
      "Firebase CLI refresh token not found. Run `firebase login --reauth`.",
    );
  }

  const authorizedUser = {
    type: "authorized_user",
    client_id: FIREBASE_CLI_CLIENT_ID,
    client_secret: FIREBASE_CLI_CLIENT_SECRET,
    refresh_token: refreshToken,
  };

  const tempFile = path.join(
    os.tmpdir(),
    `clubmanager-seed-cred-${Date.now()}-${Math.round(Math.random() * 10000)}.json`,
  );
  await writeFile(tempFile, JSON.stringify(authorizedUser), "utf8");
  return tempFile;
}

async function initFirebase(projectId: string, bucketName: string) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return {
      cleanup: async () => undefined,
      app: initializeApp({
        projectId,
        credential: cert(serviceAccount),
        storageBucket: bucketName,
      }),
    };
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccountRaw = await readFile(
      process.env.FIREBASE_SERVICE_ACCOUNT,
      "utf8",
    );
    return {
      cleanup: async () => undefined,
      app: initializeApp({
        projectId,
        credential: cert(JSON.parse(serviceAccountRaw)),
        storageBucket: bucketName,
      }),
    };
  }

  let tempCliCredentialFile: string | null = null;

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    tempCliCredentialFile = await getFirebaseCliCredentialFile();
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCliCredentialFile;
  }

  return {
    cleanup: async () => {
      if (tempCliCredentialFile) {
        await unlink(tempCliCredentialFile).catch(() => undefined);
      }
    },
    app: initializeApp({
      projectId,
      credential: applicationDefault(),
      storageBucket: bucketName,
    }),
  };
}

function dateOnly(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(baseDate: Date, offsetDays: number): Date {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + offsetDays);
  return result;
}

function dateTimeIso(baseDate: Date, offsetDays: number, hour: number, minute: number) {
  const next = addDays(baseDate, offsetDays);
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
}

function getSubscriptionStatus(startDate: string, endDate: string, today: Date) {
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "active";
}

function extensionFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

async function fetchRemoteImage(sources: string[]): Promise<{
  buffer: Buffer;
  contentType: string;
  sourceUsed: string;
}> {
  const headers = {
    "User-Agent": "clubmanager-seed-script/1.0",
    Accept: "image/*,*/*;q=0.8",
  };

  let lastError: unknown = null;
  for (const source of sources) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(source, { headers, redirect: "follow" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${source}`);
        }

        const finalUrl = response.url || source;
        if (finalUrl.includes("defaultImage")) {
          throw new Error(`Placeholder image returned for ${source}`);
        }

        const arr = await response.arrayBuffer();
        const buffer = Buffer.from(arr);
        const contentTypeHeader =
          response.headers.get("content-type") || "image/jpeg";
        const contentType = contentTypeHeader.split(";")[0].trim().toLowerCase();

        if (!contentType.startsWith("image/")) {
          throw new Error(`Unexpected content type (${contentType}) for ${source}`);
        }

        if (buffer.byteLength < 1_000) {
          throw new Error(`Image is too small (${buffer.byteLength} bytes) for ${source}`);
        }

        return {
          buffer,
          contentType,
          sourceUsed: source,
        };
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw new Error(`Unable to fetch image. Last error: ${String(lastError)}`);
}

async function uploadImageFromSources(params: {
  bucket: ReturnType<ReturnType<typeof getStorage>["bucket"]>;
  seedTag: string;
  type: "members" | "products";
  id: string;
  sources: string[];
}): Promise<string> {
  const fetched = await fetchRemoteImage(params.sources);
  const ext = extensionFromContentType(fetched.contentType);
  const objectPath = `seed/${params.seedTag}/${params.type}/${params.id}.${ext}`;
  const downloadToken = randomUUID();

  await params.bucket.file(objectPath).save(fetched.buffer, {
    resumable: false,
    contentType: fetched.contentType,
    metadata: {
      cacheControl: "public,max-age=31536000,immutable",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        seedTag: params.seedTag,
        sourceUrl: fetched.sourceUsed,
      },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${params.bucket.name}/o/${encodeURIComponent(
    objectPath,
  )}?alt=media&token=${downloadToken}`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let index = 0;

  const run = async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      output[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  };

  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => run(),
  );

  await Promise.all(runners);
  return output;
}

function buildMembers(): MemberSeed[] {
  return [
    {
      id: "seed-member-ethan-brooks",
      memberId: "2001",
      firstName: "Ethan",
      fatherName: "James",
      lastName: "Brooks",
      phone: "+1 555 0101",
      email: "ethan.brooks@example.com",
      dob: "2004-03-12",
      gender: "male",
      age: 21,
      height: "178 cm",
      weight: "74 kg",
      bloodType: "O+",
      beltSize: "A3",
      suitSize: "L",
      healthNotes: "No known medical issues.",
      baseBalance: 0,
      imageSources: ["https://randomuser.me/api/portraits/men/11.jpg"],
      subscription: {
        planName: "Performance Quarterly",
        amount: 120,
        startOffsetDays: -45,
        durationDays: 90,
        paymentStatus: "paid",
        paymentMethod: "card",
      },
    },
    {
      id: "seed-member-olivia-carter",
      memberId: "2002",
      firstName: "Olivia",
      fatherName: "Anne",
      lastName: "Carter",
      phone: "+1 555 0102",
      email: "olivia.carter@example.com",
      dob: "2008-09-04",
      gender: "female",
      age: 17,
      height: "164 cm",
      weight: "56 kg",
      bloodType: "A+",
      beltSize: "A2",
      suitSize: "M",
      healthNotes: "Mild asthma, carries inhaler.",
      baseBalance: 0,
      imageSources: ["https://randomuser.me/api/portraits/women/12.jpg"],
      subscription: {
        planName: "Starter Monthly",
        amount: 45,
        startOffsetDays: -25,
        durationDays: 30,
        paymentStatus: "paid",
        paymentMethod: "cash",
      },
    },
    {
      id: "seed-member-noah-bennett",
      memberId: "2003",
      firstName: "Noah",
      fatherName: "Ali",
      lastName: "Bennett",
      phone: "+1 555 0103",
      email: "noah.bennett@example.com",
      dob: "2001-11-18",
      gender: "male",
      age: 24,
      height: "181 cm",
      weight: "79 kg",
      bloodType: "B+",
      beltSize: "A4",
      suitSize: "L",
      healthNotes: "Recovering from right wrist strain.",
      baseBalance: 20,
      imageSources: ["https://randomuser.me/api/portraits/men/22.jpg"],
      subscription: {
        planName: "Performance Quarterly",
        amount: 120,
        startOffsetDays: -95,
        durationDays: 60,
        paymentStatus: "unpaid",
        paymentMethod: "transfer",
      },
    },
    {
      id: "seed-member-ava-turner",
      memberId: "2004",
      firstName: "Ava",
      fatherName: "Marie",
      lastName: "Turner",
      phone: "+1 555 0104",
      email: "ava.turner@example.com",
      dob: "2010-02-06",
      gender: "female",
      age: 16,
      height: "160 cm",
      weight: "52 kg",
      bloodType: "AB+",
      beltSize: "A1",
      suitSize: "S",
      healthNotes: "Beginner student, no restrictions.",
      baseBalance: 45,
      imageSources: ["https://randomuser.me/api/portraits/women/24.jpg"],
      subscription: {
        planName: "Starter Monthly",
        amount: 45,
        startOffsetDays: 7,
        durationDays: 30,
        paymentStatus: "pending",
        paymentMethod: "cash",
      },
    },
    {
      id: "seed-member-liam-johnson",
      memberId: "2005",
      firstName: "Liam",
      fatherName: "Paul",
      lastName: "Johnson",
      phone: "+1 555 0105",
      email: "liam.johnson@example.com",
      dob: "1999-07-25",
      gender: "male",
      age: 26,
      height: "186 cm",
      weight: "88 kg",
      bloodType: "O-",
      beltSize: "A4",
      suitSize: "XL",
      healthNotes: "Follows strength conditioning plan.",
      baseBalance: 0,
      imageSources: ["https://randomuser.me/api/portraits/men/35.jpg"],
      subscription: {
        planName: "Performance Quarterly",
        amount: 120,
        startOffsetDays: -10,
        durationDays: 90,
        paymentStatus: "paid",
        paymentMethod: "transfer",
      },
    },
    {
      id: "seed-member-sophia-reed",
      memberId: "2006",
      firstName: "Sophia",
      fatherName: "Grace",
      lastName: "Reed",
      phone: "+1 555 0106",
      email: "sophia.reed@example.com",
      dob: "2006-05-14",
      gender: "female",
      age: 19,
      height: "168 cm",
      weight: "58 kg",
      bloodType: "A-",
      beltSize: "A2",
      suitSize: "M",
      healthNotes: "On a break from training this season.",
      baseBalance: 0,
      imageSources: ["https://randomuser.me/api/portraits/women/36.jpg"],
    },
    {
      id: "seed-member-mason-ward",
      memberId: "2007",
      firstName: "Mason",
      fatherName: "Ibrahim",
      lastName: "Ward",
      phone: "+1 555 0107",
      email: "mason.ward@example.com",
      dob: "2003-12-01",
      gender: "male",
      age: 22,
      height: "175 cm",
      weight: "70 kg",
      bloodType: "B-",
      beltSize: "A3",
      suitSize: "L",
      healthNotes: "Needs follow-up on knee rehab.",
      baseBalance: 60,
      imageSources: ["https://randomuser.me/api/portraits/men/48.jpg"],
      subscription: {
        planName: "Starter Monthly",
        amount: 45,
        startOffsetDays: -70,
        durationDays: 45,
        paymentStatus: "unpaid",
        paymentMethod: "cash",
      },
    },
    {
      id: "seed-member-mia-hughes",
      memberId: "2008",
      firstName: "Mia",
      fatherName: "Lynn",
      lastName: "Hughes",
      phone: "+1 555 0108",
      email: "mia.hughes@example.com",
      dob: "2007-10-11",
      gender: "female",
      age: 18,
      height: "166 cm",
      weight: "54 kg",
      bloodType: "O+",
      beltSize: "A2",
      suitSize: "M",
      healthNotes: "Prepares for regional championship in spring.",
      baseBalance: 0,
      imageSources: ["https://randomuser.me/api/portraits/women/50.jpg"],
      subscription: {
        planName: "Performance Quarterly",
        amount: 120,
        startOffsetDays: -20,
        durationDays: 60,
        paymentStatus: "paid",
        paymentMethod: "card",
      },
    },
    {
      id: "seed-member-jacob-pierce",
      memberId: "2009",
      firstName: "Jacob",
      fatherName: "Rashid",
      lastName: "Pierce",
      phone: "+1 555 0109",
      email: "jacob.pierce@example.com",
      dob: "1998-01-09",
      gender: "male",
      age: 28,
      height: "183 cm",
      weight: "85 kg",
      bloodType: "AB-",
      beltSize: "A4",
      suitSize: "XL",
      healthNotes: "Advanced competitor, no restrictions.",
      baseBalance: 0,
      imageSources: ["https://randomuser.me/api/portraits/men/63.jpg"],
      subscription: {
        planName: "Elite Annual",
        amount: 420,
        startOffsetDays: -5,
        durationDays: 365,
        paymentStatus: "paid",
        paymentMethod: "transfer",
      },
    },
    {
      id: "seed-member-emma-wright",
      memberId: "2010",
      firstName: "Emma",
      fatherName: "Rose",
      lastName: "Wright",
      phone: "+1 555 0110",
      email: "emma.wright@example.com",
      dob: "2011-08-21",
      gender: "female",
      age: 15,
      height: "158 cm",
      weight: "49 kg",
      bloodType: "A+",
      beltSize: "A1",
      suitSize: "S",
      healthNotes: "New junior enrollment, orientation complete.",
      baseBalance: 45,
      imageSources: ["https://randomuser.me/api/portraits/women/67.jpg"],
      subscription: {
        planName: "Performance Quarterly",
        amount: 120,
        startOffsetDays: 20,
        durationDays: 90,
        paymentStatus: "pending",
        paymentMethod: "card",
      },
    },
  ];
}

function buildProducts(): ProductSeed[] {
  return [
    {
      id: "seed-product-pro-boxing-gloves",
      name: "Pro Boxing Gloves 12oz",
      description: "Durable gloves for sparring and heavy bag sessions.",
      price: 65,
      stock: 18,
      category: "equipment",
      trackInventory: true,
      imageSources: [
        "https://loremflickr.com/900/900/boxing,gloves?lock=101",
        "https://loremflickr.com/900/900/boxing,gloves?lock=202",
      ],
    },
    {
      id: "seed-product-karate-gi-uniform",
      name: "Karate Gi Uniform",
      description: "Lightweight competition-ready gi with reinforced stitching.",
      price: 85,
      stock: 12,
      category: "clothing",
      trackInventory: true,
      imageSources: [
        "https://loremflickr.com/900/900/karate,uniform?lock=102",
        "https://loremflickr.com/900/900/martial-arts,uniform?lock=203",
      ],
    },
    {
      id: "seed-product-mouthguard-dual-layer",
      name: "Mouthguard - Dual Layer",
      description: "Impact-absorbing mouthguard for training and sparring.",
      price: 18,
      stock: 40,
      category: "accessories",
      trackInventory: true,
      imageSources: [
        "https://loremflickr.com/900/900/mouthguard,sports?lock=103",
        "https://loremflickr.com/900/900/mouthguard,boxing?lock=204",
      ],
    },
    {
      id: "seed-product-sports-bottle-750ml",
      name: "Insulated Sports Bottle 750ml",
      description: "Double-wall bottle to keep drinks cold during sessions.",
      price: 22,
      stock: 30,
      category: "drinks",
      trackInventory: true,
      imageSources: [
        "https://loremflickr.com/900/900/water,bottle,sport?lock=104",
        "https://loremflickr.com/900/900/sports,bottle?lock=205",
      ],
    },
    {
      id: "seed-product-resistance-band-set",
      name: "Resistance Band Set",
      description: "Five-level resistance set for mobility and warm-up drills.",
      price: 35,
      stock: 20,
      category: "equipment",
      trackInventory: true,
      imageSources: [
        "https://loremflickr.com/900/900/resistance,band,fitness?lock=105",
        "https://loremflickr.com/900/900/fitness,band?lock=206",
      ],
    },
    {
      id: "seed-product-gym-duffle-bag",
      name: "Gym Duffle Bag",
      description: "Spacious bag with wet compartment for training gear.",
      price: 49,
      stock: 16,
      category: "accessories",
      trackInventory: true,
      imageSources: [
        "https://loremflickr.com/900/900/gym,duffel-bag?lock=110",
        "https://loremflickr.com/900/900/backpack,gym?lock=106",
      ],
    },
    {
      id: "seed-product-protein-bar-pack",
      name: "Protein Bar Pack (6)",
      description: "Post-workout snack pack with mixed chocolate flavors.",
      price: 14,
      stock: 25,
      category: "supplements",
      trackInventory: true,
      imageSources: [
        "https://loremflickr.com/900/900/protein,bar?lock=111",
        "https://loremflickr.com/900/900/energy,bar?lock=207",
      ],
    },
    {
      id: "seed-product-club-towel",
      name: "Club Training Towel",
      description: "Soft microfiber towel with stitched academy logo.",
      price: 12,
      stock: 50,
      category: "accessories",
      trackInventory: true,
      imageSources: [
        "https://loremflickr.com/900/900/towel,gym?lock=108",
        "https://loremflickr.com/900/900/sports,towel?lock=208",
      ],
    },
  ];
}

function buildRoles(): RoleSeed[] {
  return [
    {
      id: "seed-role-coach",
      name: "Coach",
      permissions: [
        "members.view",
        "members.add",
        "members.edit",
        "attendance.view",
        "attendance.add",
        "belts.view",
        "belts.add",
        "subscriptions.view",
        "sales.view",
      ],
    },
    {
      id: "seed-role-accountant",
      name: "Accountant",
      permissions: [
        "finance.view",
        "finance.add",
        "finance.edit",
        "finance.delete",
        "sales.view",
        "sales.edit",
        "subscriptions.view",
        "logs.view",
      ],
    },
    {
      id: "seed-role-front-desk",
      name: "Front Desk",
      permissions: [
        "members.view",
        "members.add",
        "attendance.view",
        "attendance.add",
        "subscriptions.view",
        "subscriptions.add",
        "store.view",
        "sales.add",
      ],
    },
  ];
}

async function commitWrites(
  db: ReturnType<typeof getFirestore>,
  writes: WriteDoc[],
  dryRun: boolean,
) {
  if (dryRun) {
    console.log(`[dry-run] Would write ${writes.length} documents.`);
    return;
  }

  let batch = db.batch();
  let operations = 0;

  for (const write of writes) {
    const ref = db.doc(write.path);
    batch.set(ref, stripUndefined(write.data), write.merge ? { merge: true } : undefined);
    operations += 1;

    if (operations === 450) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }
}

function stripUndefined<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => stripUndefined(item)) as T;
  }

  if (input && typeof input === "object") {
    const result: Record<string, unknown> = {};
    Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
      if (value === undefined) return;
      result[key] = stripUndefined(value);
    });
    return result as T;
  }

  return input;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const now = new Date();
  const projectFromRc = await readDefaultProjectIdFromFirebaseRc();
  const projectId =
    options.projectId ||
    projectFromRc ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      "Missing project ID. Pass --project <projectId> or set .firebaserc default project.",
    );
  }

  const envProjectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (envProjectId && envProjectId !== projectId) {
    console.warn(
      `Warning: VITE_FIREBASE_PROJECT_ID=${envProjectId} differs from target project ${projectId}.`,
    );
  }

  const bucketName =
    options.bucket ||
    (process.env.VITE_FIREBASE_STORAGE_BUCKET &&
    (!envProjectId || envProjectId === projectId)
      ? process.env.VITE_FIREBASE_STORAGE_BUCKET
      : undefined) ||
    `${projectId}.firebasestorage.app`;

  console.log(`Target project: ${projectId}`);
  console.log(`Target bucket: ${bucketName}`);
  console.log(`Seed tag: ${options.seedTag}`);
  if (options.dryRun) {
    console.log("Running in dry-run mode. No writes will be committed.");
  }

  const { app, cleanup } = await initFirebase(projectId, bucketName);

  try {
    const db = getFirestore(app);
    const storage = getStorage(app);
    const bucket = storage.bucket(bucketName);

    const [bucketExists] = await bucket.exists();
    if (!bucketExists) {
      throw new Error(`Storage bucket not found: ${bucketName}`);
    }

    const members = buildMembers();
    const products = buildProducts();
    const roles = buildRoles();

    console.log("Uploading member images...");
    const memberImageEntries = await mapWithConcurrency(
      members,
      4,
      async (member) => {
        const imageUrl = await uploadImageFromSources({
          bucket,
          seedTag: options.seedTag,
          type: "members",
          id: member.id,
          sources: member.imageSources,
        });
        return { id: member.id, imageUrl };
      },
    );
    const memberImageMap = new Map(memberImageEntries.map((x) => [x.id, x.imageUrl]));

    console.log("Uploading product images...");
    const productImageEntries = await mapWithConcurrency(
      products,
      4,
      async (product) => {
        const imageUrl = await uploadImageFromSources({
          bucket,
          seedTag: options.seedTag,
          type: "products",
          id: product.id,
          sources: product.imageSources,
        });
        return { id: product.id, imageUrl };
      },
    );
    const productImageMap = new Map(productImageEntries.map((x) => [x.id, x.imageUrl]));

    const settingsSnap = await db.doc("settings/general").get();
    const existingSettings = settingsSnap.exists
      ? (settingsSnap.data() as Record<string, unknown>)
      : {};
    const managerEmail =
      typeof existingSettings.managerEmail === "string" && existingSettings.managerEmail
        ? existingSettings.managerEmail
        : "admin@peakcombatacademy.com";

    const writes: WriteDoc[] = [];

    writes.push({
      path: "settings/general",
      merge: true,
      data: {
        name: "Peak Combat Academy",
        managerEmail,
        phone: "+1 555 0100",
        location: "123 Harbor Street, San Diego, CA",
        socials: {
          facebook: "https://facebook.com/peakcombatacademy",
          instagram: "https://instagram.com/peakcombatacademy",
          twitter: "https://x.com/peakcombatclub",
        },
        socialLinks: {
          website: "https://www.peakcombatacademy.com",
        },
        whatsappTemplate:
          "Hi {name}, your membership is active until {endDate}. See you at training.",
        whatsappTemplates: [
          {
            id: "seed-template-reminder",
            title: "Renewal Reminder",
            body: "Hi {name}, your membership ends on {endDate}. Reply to renew your plan.",
          },
          {
            id: "seed-template-balance",
            title: "Balance Follow-up",
            body: "Hi {name}, your current balance is {balance}. Please contact reception for payment options.",
          },
        ],
        receiptType: "thermal",
        receiptLogoThermal:
          typeof existingSettings.receiptLogoThermal === "string"
            ? existingSettings.receiptLogoThermal
            : "",
        receiptA4Design:
          typeof existingSettings.receiptA4Design === "string"
            ? existingSettings.receiptA4Design
            : "",
        screensaverEnabled: false,
        screensaverTimeout: 90,
        productCategories: [
          "supplements",
          "equipment",
          "clothing",
          "accessories",
          "drinks",
          "general",
        ],
        seedTag: options.seedTag,
        lastSeededAt: now.toISOString(),
      },
    });

    const belts = [
      { id: "seed-belt-white", name: "White Belt", color: "#f8fafc", order: 1 },
      { id: "seed-belt-yellow", name: "Yellow Belt", color: "#facc15", order: 2 },
      { id: "seed-belt-orange", name: "Orange Belt", color: "#fb923c", order: 3 },
      { id: "seed-belt-green", name: "Green Belt", color: "#22c55e", order: 4 },
      { id: "seed-belt-blue", name: "Blue Belt", color: "#3b82f6", order: 5 },
      { id: "seed-belt-brown", name: "Brown Belt", color: "#8b5a2b", order: 6 },
      { id: "seed-belt-black", name: "Black Belt", color: "#111827", order: 7 },
    ];

    belts.forEach((belt) => {
      writes.push({
        path: `belts/${belt.id}`,
        data: {
          name: belt.name,
          color: belt.color,
          order: belt.order,
          seedTag: options.seedTag,
        },
      });
    });

    const packages = [
      { id: "seed-package-starter-monthly", name: "Starter Monthly", duration: 30, price: 45 },
      {
        id: "seed-package-performance-quarterly",
        name: "Performance Quarterly",
        duration: 90,
        price: 120,
      },
      { id: "seed-package-elite-annual", name: "Elite Annual", duration: 365, price: 420 },
    ];

    packages.forEach((pkg) => {
      writes.push({
        path: `packages/${pkg.id}`,
        data: {
          name: pkg.name,
          duration: pkg.duration,
          price: pkg.price,
          seedTag: options.seedTag,
        },
      });
    });

    roles.forEach((role) => {
      writes.push({
        path: `roles/${role.id}`,
        data: {
          name: role.name,
          permissions: role.permissions,
          seedTag: options.seedTag,
        },
      });
    });

    const memberProjection: Record<
      string,
      {
        id: string;
        memberId: string;
        name: string;
        status: string;
        subscriptionStart: string;
        subscriptionEnd: string;
        subscriptionAmount: number;
        paymentStatus?: PaymentStatus;
      }
    > = {};

    const subscriptions: Array<{
      id: string;
      memberId: string;
      memberName: string;
      planName: string;
      amount: number;
      startDate: string;
      endDate: string;
      status: string;
      paymentStatus: PaymentStatus;
      paymentMethod: PaymentMethod;
    }> = [];

    members.forEach((member) => {
      let status = "inactive";
      let subscriptionStart = "";
      let subscriptionEnd = "";
      let subscriptionAmount = 0;
      let balance = member.baseBalance;
      let paymentStatus: PaymentStatus | undefined;

      if (member.subscription) {
        const startDate = dateOnly(addDays(now, member.subscription.startOffsetDays));
        const endDate = dateOnly(
          addDays(now, member.subscription.startOffsetDays + member.subscription.durationDays),
        );
        status = getSubscriptionStatus(startDate, endDate, now);
        subscriptionStart = startDate;
        subscriptionEnd = endDate;
        subscriptionAmount = member.subscription.amount;
        paymentStatus = member.subscription.paymentStatus;

        if (member.subscription.paymentStatus !== "paid") {
          balance += member.subscription.amount;
        }

        subscriptions.push({
          id: `seed-sub-${member.id.replace("seed-member-", "")}`,
          memberId: member.id,
          memberName: `${member.firstName} ${member.fatherName} ${member.lastName}`,
          planName: member.subscription.planName,
          amount: member.subscription.amount,
          startDate,
          endDate,
          status,
          paymentStatus: member.subscription.paymentStatus,
          paymentMethod: member.subscription.paymentMethod,
        });
      }

      writes.push({
        path: `members/${member.id}`,
        data: {
          name: `${member.firstName} ${member.fatherName} ${member.lastName}`,
          firstName: member.firstName,
          fatherName: member.fatherName,
          lastName: member.lastName,
          memberId: member.memberId,
          cpr: `CPR-${member.memberId}`,
          phone: member.phone,
          email: member.email,
          dob: member.dob,
          gender: member.gender,
          age: member.age,
          height: member.height,
          weight: member.weight,
          bloodType: member.bloodType,
          beltSize: member.beltSize,
          suitSize: member.suitSize,
          healthNotes: member.healthNotes,
          subscriptionStart,
          subscriptionEnd,
          status,
          balance,
          imageUrl: memberImageMap.get(member.id) || "",
          documents: [],
          seedTag: options.seedTag,
        },
      });

      memberProjection[member.id] = {
        id: member.id,
        memberId: member.memberId,
        name: `${member.firstName} ${member.fatherName} ${member.lastName}`,
        status,
        subscriptionStart,
        subscriptionEnd,
        subscriptionAmount,
        paymentStatus,
      };
    });

    subscriptions.forEach((sub) => {
      writes.push({
        path: `subscriptions/${sub.id}`,
        data: {
          memberId: sub.memberId,
          memberName: sub.memberName,
          planName: sub.planName,
          amount: sub.amount,
          startDate: sub.startDate,
          endDate: sub.endDate,
          status: sub.status,
          paymentStatus: sub.paymentStatus,
          paymentMethod: sub.paymentMethod,
          seedTag: options.seedTag,
        },
      });
    });

    products.forEach((product) => {
      writes.push({
        path: `products/${product.id}`,
        data: {
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          category: product.category,
          imageUrl: productImageMap.get(product.id) || "",
          trackInventory: product.trackInventory,
          seedTag: options.seedTag,
        },
      });
    });

    const memberBelts = [
      {
        id: "seed-memberbelt-ethan-blue",
        memberId: "seed-member-ethan-brooks",
        beltId: "seed-belt-blue",
        awardedOffset: -30,
      },
      {
        id: "seed-memberbelt-olivia-green",
        memberId: "seed-member-olivia-carter",
        beltId: "seed-belt-green",
        awardedOffset: -18,
      },
      {
        id: "seed-memberbelt-noah-orange",
        memberId: "seed-member-noah-bennett",
        beltId: "seed-belt-orange",
        awardedOffset: -80,
      },
      {
        id: "seed-memberbelt-ava-yellow",
        memberId: "seed-member-ava-turner",
        beltId: "seed-belt-yellow",
        awardedOffset: -2,
      },
      {
        id: "seed-memberbelt-liam-brown",
        memberId: "seed-member-liam-johnson",
        beltId: "seed-belt-brown",
        awardedOffset: -5,
      },
      {
        id: "seed-memberbelt-mia-blue",
        memberId: "seed-member-mia-hughes",
        beltId: "seed-belt-blue",
        awardedOffset: -12,
      },
      {
        id: "seed-memberbelt-jacob-black",
        memberId: "seed-member-jacob-pierce",
        beltId: "seed-belt-black",
        awardedOffset: -1,
      },
    ];

    memberBelts.forEach((entry) => {
      writes.push({
        path: `memberBelts/${entry.id}`,
        data: {
          memberId: entry.memberId,
          beltId: entry.beltId,
          awardedAt: dateTimeIso(now, entry.awardedOffset, 19, 30),
          seedTag: options.seedTag,
        },
      });
    });

    const attendanceTargets = members.filter(
      (member) => memberProjection[member.id]?.status === "active",
    );
    const attendanceWrites: WriteDoc[] = [];

    for (let dayOffset = 0; dayOffset >= -13; dayOffset -= 1) {
      const attendanceDate = dateOnly(addDays(now, dayOffset));
      attendanceTargets.forEach((member, index) => {
        if ((Math.abs(dayOffset) + index) % 3 === 0) return;
        const checkInHour = 17 + (index % 3);
        const checkOutHour = checkInHour + 1;
        attendanceWrites.push({
          path: `attendance/seed-att-${attendanceDate.replace(/-/g, "")}-${member.memberId}`,
          data: {
            memberId: member.memberId,
            memberName: `${member.firstName} ${member.fatherName} ${member.lastName}`,
            date: attendanceDate,
            checkIn: dateTimeIso(now, dayOffset, checkInHour, 5),
            checkOut: dateTimeIso(now, dayOffset, checkOutHour, 25),
            notes: "Regular evening class attendance.",
            seedTag: options.seedTag,
          },
        });
      });
    }
    writes.push(...attendanceWrites);

    const productById = new Map(products.map((product) => [product.id, product]));
    const subscriptionByMemberId = new Map(
      subscriptions.map((sub) => [sub.memberId, sub]),
    );

    const sales = [
      {
        id: "seed-sale-001",
        productId: "seed-product-pro-boxing-gloves",
        memberId: "seed-member-ethan-brooks",
        buyerName: "Ethan Brooks",
        quantity: 1,
        dateOffset: -3,
        paymentMethod: "card" as PaymentMethod,
        paymentStatus: "paid" as const,
        status: "completed",
        receiptId: "RCPT-2026-0201",
      },
      {
        id: "seed-sale-002",
        productId: "seed-product-mouthguard-dual-layer",
        memberId: "seed-member-olivia-carter",
        buyerName: "Olivia Carter",
        quantity: 2,
        dateOffset: -3,
        paymentMethod: "cash" as PaymentMethod,
        paymentStatus: "paid" as const,
        status: "completed",
        receiptId: "RCPT-2026-0201",
      },
      {
        id: "seed-sale-003",
        productId: "seed-product-sports-bottle-750ml",
        buyerName: "Walk-in Customer",
        quantity: 1,
        dateOffset: -2,
        paymentMethod: "card" as PaymentMethod,
        paymentStatus: "paid" as const,
        status: "completed",
        receiptId: "RCPT-2026-0202",
      },
      {
        id: "seed-sale-004",
        productId: "seed-product-karate-gi-uniform",
        memberId: "seed-member-jacob-pierce",
        buyerName: "Jacob Pierce",
        quantity: 1,
        dateOffset: -10,
        paymentMethod: "transfer" as PaymentMethod,
        paymentStatus: "partially_paid" as const,
        status: "completed",
        receiptId: "RCPT-2026-0196",
      },
      {
        id: "seed-sale-005",
        productId: "seed-product-resistance-band-set",
        buyerName: "Walk-in Customer",
        quantity: 1,
        dateOffset: -15,
        paymentMethod: "cash" as PaymentMethod,
        paymentStatus: "paid" as const,
        status: "completed",
        receiptId: "RCPT-2026-0190",
      },
      {
        id: "seed-sale-006",
        productId: "seed-product-protein-bar-pack",
        memberId: "seed-member-mia-hughes",
        buyerName: "Mia Hughes",
        quantity: 3,
        dateOffset: -4,
        paymentMethod: "cash" as PaymentMethod,
        paymentStatus: "paid" as const,
        status: "completed",
        receiptId: "RCPT-2026-0200",
      },
      {
        id: "seed-sale-007",
        productId: "seed-product-club-towel",
        memberId: "seed-member-ava-turner",
        buyerName: "Ava Turner",
        quantity: 2,
        dateOffset: -6,
        paymentMethod: "cash" as PaymentMethod,
        paymentStatus: "paid" as const,
        status: "completed",
        receiptId: "RCPT-2026-0199",
      },
      {
        id: "seed-sale-008",
        productId: "seed-product-gym-duffle-bag",
        memberId: "seed-member-liam-johnson",
        buyerName: "Liam Johnson",
        quantity: 1,
        dateOffset: -20,
        paymentMethod: "transfer" as PaymentMethod,
        paymentStatus: "paid" as const,
        status: "completed",
        receiptId: "RCPT-2026-0187",
      },
      {
        id: "seed-sale-009",
        productId: "seed-product-pro-boxing-gloves",
        memberId: "seed-member-noah-bennett",
        buyerName: "Noah Bennett",
        quantity: 1,
        dateOffset: -30,
        paymentMethod: "cash" as PaymentMethod,
        paymentStatus: "unpaid" as const,
        status: "cancelled",
        cancelledReason: "Customer requested another size.",
        receiptId: "RCPT-2026-0175",
      },
    ];

    sales.forEach((sale, index) => {
      const product = productById.get(sale.productId);
      if (!product) return;
      const date = dateTimeIso(now, sale.dateOffset, 18 + (index % 2), 10);

      writes.push({
        path: `sales/${sale.id}`,
        data: {
          productId: sale.productId,
          productName: product.name,
          quantity: sale.quantity,
          unitPrice: product.price,
          totalPrice: product.price * sale.quantity,
          memberId: sale.memberId,
          buyerName: sale.buyerName,
          buyerPhone:
            sale.memberId && memberProjection[sale.memberId]
              ? (memberProjection[sale.memberId] &&
                  members.find((m) => m.id === sale.memberId)?.phone) ||
                null
              : null,
          date,
          paymentMethod: sale.paymentMethod,
          paymentStatus: sale.paymentStatus,
          status: sale.status,
          cancelledReason: sale.cancelledReason || null,
          cancelledAt:
            sale.status === "cancelled"
              ? dateTimeIso(now, sale.dateOffset + 1, 10, 0)
              : null,
          receiptId: sale.receiptId,
          seedTag: options.seedTag,
        },
      });
    });

    const subscriptionSaleMembers = [
      "seed-member-ethan-brooks",
      "seed-member-olivia-carter",
      "seed-member-liam-johnson",
      "seed-member-jacob-pierce",
    ];

    subscriptionSaleMembers.forEach((memberId, idx) => {
      const sub = subscriptionByMemberId.get(memberId);
      if (!sub) return;
      writes.push({
        path: `sales/seed-sale-sub-${idx + 1}`,
        data: {
          productId: "subscription",
          productName: `Membership - ${sub.planName}`,
          quantity: 1,
          unitPrice: sub.amount,
          totalPrice: sub.amount,
          memberId: sub.memberId,
          buyerName: sub.memberName,
          buyerPhone:
            members.find((member) => member.id === sub.memberId)?.phone || null,
          date: dateTimeIso(now, -Math.max(2, idx * 5 + 6), 12, 0),
          paymentMethod: sub.paymentMethod,
          paymentStatus: sub.paymentStatus === "unpaid" ? "unpaid" : "paid",
          status: "completed",
          subscriptionId: sub.id,
          receiptId: `RCPT-2026-SUB-${idx + 1}`,
          seedTag: options.seedTag,
        },
      });
    });

    const expenses = [
      {
        id: "seed-expense-rent-current",
        category: "rent",
        description: "Monthly facility rent",
        amount: 1200,
        offset: -10,
      },
      {
        id: "seed-expense-salaries-current",
        category: "salaries",
        description: "Coaching and front desk payroll",
        amount: 1500,
        offset: -3,
      },
      {
        id: "seed-expense-utilities-current",
        category: "utilities",
        description: "Electricity and water bills",
        amount: 280,
        offset: -6,
      },
      {
        id: "seed-expense-equipment-current",
        category: "equipment",
        description: "Heavy bag replacement and mat repair",
        amount: 340,
        offset: -12,
      },
      {
        id: "seed-expense-maintenance-current",
        category: "maintenance",
        description: "Routine sanitization and cleaning supplies",
        amount: 95,
        offset: -8,
      },
      {
        id: "seed-expense-marketing-current",
        category: "marketing",
        description: "Local social media campaign",
        amount: 190,
        offset: -15,
      },
      {
        id: "seed-expense-other-current",
        category: "other",
        description: "Tournament registration processing fees",
        amount: 60,
        offset: -1,
      },
      {
        id: "seed-expense-rent-previous",
        category: "rent",
        description: "Previous month facility rent",
        amount: 1200,
        offset: -35,
      },
    ];

    expenses.forEach((expense) => {
      writes.push({
        path: `expenses/${expense.id}`,
        data: {
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          date: dateOnly(addDays(now, expense.offset)),
          expensesTitle: expense.description,
          seedTag: options.seedTag,
        },
      });
    });

    const invites = [
      {
        id: "seed-invite-coach-daniel",
        email: "daniel.miller@example.com",
        name: "Daniel Miller",
        role: "seed-role-coach",
        createdAt: dateTimeIso(now, -4, 9, 15),
      },
      {
        id: "seed-invite-accountant-hannah",
        email: "hannah.lee@example.com",
        name: "Hannah Lee",
        role: "seed-role-accountant",
        createdAt: dateTimeIso(now, -2, 10, 30),
      },
      {
        id: "seed-invite-frontdesk-ryan",
        email: "ryan.clark@example.com",
        name: "Ryan Clark",
        role: "seed-role-front-desk",
        createdAt: dateTimeIso(now, -1, 13, 45),
      },
    ];

    invites.forEach((invite) => {
      writes.push({
        path: `user_invites/${invite.id}`,
        data: {
          email: invite.email,
          name: invite.name,
          role: invite.role,
          createdAt: invite.createdAt,
          seedTag: options.seedTag,
        },
      });
    });

    const activityLogs = [
      {
        id: "seed-log-001",
        action: "seed.run",
        entityType: "system",
        description: "Demo seed data refreshed",
        metadata: JSON.stringify({ tag: options.seedTag }),
      },
      {
        id: "seed-log-002",
        action: "settings.update",
        entityType: "settings",
        description: "Demo English club profile updated",
        metadata: null,
      },
      {
        id: "seed-log-003",
        action: "member.create",
        entityType: "member",
        entityId: "seed-member-ethan-brooks",
        description: "Member seeded: Ethan James Brooks",
        metadata: null,
      },
      {
        id: "seed-log-004",
        action: "subscription.create",
        entityType: "subscription",
        entityId: "seed-sub-ethan-brooks",
        description: "Subscription seeded for Ethan James Brooks",
        metadata: null,
      },
      {
        id: "seed-log-005",
        action: "product.create",
        entityType: "product",
        entityId: "seed-product-pro-boxing-gloves",
        description: "Product seeded: Pro Boxing Gloves 12oz",
        metadata: null,
      },
      {
        id: "seed-log-006",
        action: "sale.create",
        entityType: "sale",
        entityId: "seed-sale-001",
        description: "Sale seeded for Pro Boxing Gloves 12oz",
        metadata: null,
      },
      {
        id: "seed-log-007",
        action: "expense.create",
        entityType: "expense",
        entityId: "seed-expense-rent-current",
        description: "Expense seeded: Monthly facility rent",
        metadata: null,
      },
      {
        id: "seed-log-008",
        action: "attendance.create",
        entityType: "attendance",
        description: "Attendance records seeded for active members",
        metadata: null,
      },
      {
        id: "seed-log-009",
        action: "role.create",
        entityType: "role",
        entityId: "seed-role-coach",
        description: "Custom role seeded: Coach",
        metadata: null,
      },
      {
        id: "seed-log-010",
        action: "user.invite",
        entityType: "user",
        entityId: "seed-invite-coach-daniel",
        description: "Invite seeded for Daniel Miller",
        metadata: null,
      },
    ];

    activityLogs.forEach((log, idx) => {
      writes.push({
        path: `activityLogs/${log.id}`,
        data: {
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId || null,
          description: log.description,
          metadata: log.metadata,
          createdAt: dateTimeIso(now, -idx, 8 + (idx % 4), 15),
          seedTag: options.seedTag,
        },
      });
    });

    const maxMemberId = Math.max(...members.map((member) => Number(member.memberId)));
    const counterSnap = await db.doc("config/counters").get();
    const currentCounter =
      counterSnap.exists && Number.isFinite(Number(counterSnap.data()?.memberCount))
        ? Number(counterSnap.data()?.memberCount)
        : 1000;

    writes.push({
      path: "config/counters",
      merge: true,
      data: {
        memberCount: Math.max(currentCounter, maxMemberId),
        seedTag: options.seedTag,
        lastSeededAt: now.toISOString(),
      },
    });

    writes.push({
      path: "config/seed",
      merge: true,
      data: {
        tag: options.seedTag,
        seededAt: now.toISOString(),
        projectId,
        bucketName,
        counts: {
          members: members.length,
          subscriptions: subscriptions.length,
          products: products.length,
          attendance: attendanceWrites.length,
          sales: sales.length + subscriptionSaleMembers.length,
          expenses: expenses.length,
          roles: roles.length,
          invites: invites.length,
          belts: belts.length,
          memberBelts: memberBelts.length,
          packages: packages.length,
          activityLogs: activityLogs.length,
        },
      },
    });

    await commitWrites(db, writes, options.dryRun);

    console.log("Seed completed.");
    console.log(`Documents written: ${writes.length}`);
    console.log(`Member images uploaded: ${memberImageEntries.length}`);
    console.log(`Product images uploaded: ${productImageEntries.length}`);
  } finally {
    await cleanup();
  }
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
