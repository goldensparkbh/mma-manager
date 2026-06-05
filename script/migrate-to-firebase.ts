import dotenv from "dotenv";
import { readFile } from "fs/promises";
import { Client } from "pg";
import { cert, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.migrate.local" });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to migrate Postgres data.");
}

async function initFirebase() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return initializeApp({ credential: cert(parsed) });
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const contents = await readFile(process.env.FIREBASE_SERVICE_ACCOUNT, "utf-8");
    const parsed = JSON.parse(contents);
    return initializeApp({ credential: cert(parsed) });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault() });
  }

  throw new Error(
    "Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT, FIREBASE_SERVICE_ACCOUNT_JSON, or GOOGLE_APPLICATION_CREDENTIALS."
  );
}

const toCamelCase = (value: string) =>
  value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const normalizeValue = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  return value;
};

const normalizeRow = (row: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    result[toCamelCase(key)] = normalizeValue(value);
  });
  return result;
};

type TableMapping = {
  collection: string;
  tables: string[];
};

const tableMappings: TableMapping[] = [
  { collection: "members", tables: ["members"] },
  { collection: "products", tables: ["products"] },
  { collection: "attendance", tables: ["attendance"] },
  { collection: "subscriptions", tables: ["subscriptions"] },
  { collection: "sales", tables: ["sales"] },
  { collection: "expenses", tables: ["expenses"] },
  { collection: "activityLogs", tables: ["activityLogs", "activity_logs"] },
];

async function tableExists(client: Client, name: string) {
  const result = await client.query("select to_regclass($1) as reg", [name]);
  return Boolean(result.rows[0]?.reg);
}

async function migrateTable(
  client: Client,
  db: ReturnType<typeof getFirestore>,
  mapping: TableMapping
) {
  let tableName = mapping.tables[0];
  for (const candidate of mapping.tables) {
    if (await tableExists(client, candidate)) {
      tableName = candidate;
      break;
    }
  }
  const exists = await tableExists(client, tableName);

  if (!exists) {
    console.log(`Skipping ${mapping.collection}: table not found (${tableName}).`);
    return;
  }

  const result = await client.query(`select * from ${tableName}`);
  if (result.rows.length === 0) {
    console.log(`Skipping ${mapping.collection}: no rows.`);
    return;
  }

  let batch = db.batch();
  let batchCount = 0;
  let total = 0;

  for (const row of result.rows) {
    const data = normalizeRow(row);
    const id = data.id ? String(data.id) : null;
    if (id) {
      delete data.id;
    }
    const docRef = id ? db.collection(mapping.collection).doc(id) : db.collection(mapping.collection).doc();
    batch.set(docRef, data, { merge: true });
    batchCount += 1;
    total += 1;

    if (batchCount === 500) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Migrated ${total} rows into ${mapping.collection}.`);
}

async function run() {
  const app = await initFirebase();
  const db = getFirestore(app);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const mapping of tableMappings) {
      await migrateTable(client, db, mapping);
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
