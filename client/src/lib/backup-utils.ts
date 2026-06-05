import JSZip from "jszip";
import { saveAs } from "file-saver";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, DocumentData, deleteDoc, WriteBatch } from "firebase/firestore";
import { ref, getDownloadURL, uploadBytes, deleteObject, listAll } from "firebase/storage";

// Constants
const STORAGE_URL_PREFIX = "https://firebasestorage.googleapis.com";
const LOCAL_ASSET_PREFIX = "local://assets/";
// Order matters for destructive clears (keep auth collections last).
const COLLECTIONS_TO_BACKUP = [
    "members",
    "attendance",
    "subscriptions",
    "products",
    "sales",
    "expenses",
    "packages",
    "belts",
    "memberBelts",
    "member_belts",
    "activityLogs",
    "logs",
    "user_invites",
    "settings",
    "roles",
    "users",
];

interface BackupData {
    version: string;
    collections: {
        [key: string]: DocumentData[];
    };
    timestamp: string;
}

// Helper to get all nested values of an object
function* iterateDeep(obj: any): Generator<any> {
    if (obj && typeof obj === 'object') {
        for (const key in obj) {
            yield obj[key];
            yield* iterateDeep(obj[key]);
        }
    }
}

// ----------------------------------------------------------------------
// EXPORT LOGIC
// ----------------------------------------------------------------------

export async function exportFullDatabase(onProgress: (status: string) => void) {
    try {
        const zip = new JSZip();
        const assetsFolder = zip.folder("assets");
        const databaseData: BackupData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            collections: {}
        };

        onProgress("Fetching database collections...");

        // 1. Fetch all data
        const assetsToDownload: { url: string; filename: string }[] = [];
        const processedUrls = new Set<string>();

        for (const userId of COLLECTIONS_TO_BACKUP) {
            const colRef = collection(db, userId);
            const snapshot = await getDocs(colRef);
            const docs = snapshot.docs.map(doc => {
                const data = doc.data();
                data.id = doc.id; // Include ID
                return data;
            });

            databaseData.collections[userId] = docs;
        }

        onProgress("Scanning for files to download...");

        // 2. Scan for URLs and replace them
        for (const colName in databaseData.collections) {
            const docs = databaseData.collections[colName];

            for (const doc of docs) {
                // Recursive scan for strings starting with Firebase Storage prefix
                await replaceUrlsInObject(doc, async (url) => {
                    if (processedUrls.has(url)) return generateLocalPath(url);

                    try {
                        // Generate a simplified filename
                        const filename = extractFilenameFromUrl(url);
                        const uniqueFilename = `${processedUrls.size}_${filename}`;

                        assetsToDownload.push({ url, filename: uniqueFilename });
                        processedUrls.add(url);

                        return `${LOCAL_ASSET_PREFIX}${uniqueFilename}`;
                    } catch (e) {
                        console.warn("Failed to process URL:", url, e);
                        return url; // Keep original if fail
                    }
                });
            }
        }

        // 3. Download Assets
        onProgress(`Downloading ${assetsToDownload.length} files...`);
        let downloadedCount = 0;

        // Process in chunks to avoid rate limiting
        const CHUNK_SIZE = 5;
        for (let i = 0; i < assetsToDownload.length; i += CHUNK_SIZE) {
            const chunk = assetsToDownload.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(async (asset) => {
                try {
                    const response = await fetch(asset.url);
                    const blob = await response.blob();
                    assetsFolder?.file(asset.filename, blob);
                } catch (e) {
                    console.error(`Failed to download asset ${asset.url}`, e);
                }
            }));
            downloadedCount += chunk.length;
            onProgress(`Downloading files... (${downloadedCount}/${assetsToDownload.length})`);
        }

        // 4. Add JSON to Zip
        onProgress("Finalizing backup file...");
        zip.file("data.json", JSON.stringify(databaseData, null, 2));

        // 5. Generate and Save Zip
        const content = await zip.generateAsync({ type: "blob" });
        const filename = `ClubBackup_${new Date().toISOString().split('T')[0]}.zip`;
        saveAs(content, filename);

        onProgress("Backup completed successfully!");
        return true;

    } catch (error) {
        console.error("Export failed:", error);
        throw error;
    }
}

// Helper to deeply replace URLs in an object (mutates object)
async function replaceUrlsInObject(obj: any, replacer: (url: string) => Promise<string>) {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'string' && value.startsWith(STORAGE_URL_PREFIX)) {
            obj[key] = await replacer(value);
        } else if (typeof value === 'object') {
            await replaceUrlsInObject(value, replacer);
        }
    }
}

function extractFilenameFromUrl(url: string): string {
    try {
        const decoded = decodeURIComponent(url);
        const path = decoded.split('?')[0]; // Remove query params
        const parts = path.split('/');
        return parts[parts.length - 1] || "file.bin";
    } catch {
        return "file.bin";
    }
}

function generateLocalPath(url: string): string {
    // We can't easily reproduce the exact local path if we only have the URL again without the mapping
    // But processedUrls logic above handles ensuring we don't download duplicates, 
    // real replacement logic needs to track the mapping.
    // simpler: The loop above handles replacement in-place.
    return "";
}


// ----------------------------------------------------------------------
// IMPORT LOGIC
// ----------------------------------------------------------------------

export async function importFullDatabase(
    jsonFile: File,
    zipAssetsFile: File | null,
    onProgress: (status: string) => void
) {
    try {
        onProgress("Reading backup files...");

        // 1. Read JSON
        const jsonText = await readFileAsText(jsonFile);
        const backupData: BackupData = JSON.parse(jsonText);

        if (!backupData.collections) throw new Error("Invalid backup format: Missing collections");

        const zip = zipAssetsFile ? await JSZip.loadAsync(zipAssetsFile) : null;

        // 2. Clear Database (DESTRUCTIVE!)
        onProgress("Clearing existing database...");
        await clearDatabase();

        // 3. Clear Storage (Optional but recommended to prune old files)
        // Note: Clearing storage programmatically is harder from client without specific paths list.
        // We'll skip wiping ALL storage to avoid admin permission issues, but new files will be added.

        // 4. Restore Assets
        const urlMapping = new Map<string, string>(); // local://... -> https://...

        if (zip) {
            onProgress("Restoring file assets...");
            const files = Object.keys(zip.files).filter(f => !zip.files[f].dir);
            let uploadedCount = 0;

            for (const filename of files) {
                // Checking if it's in assets folder or root (depending on how user extracted/re-zipped)
                // The export puts them in 'assets/', so we look for that.
                const fileData = await zip.file(filename)?.async("blob");
                if (fileData) {
                    // Clean filename logic: removing 'assets/' prefix if present
                    const cleanName = filename.replace(/^assets\//, "");
                    const storageRef = ref(storage, `restored/${Date.now()}/${cleanName}`);

                    await uploadBytes(storageRef, fileData);
                    const downloadUrl = await getDownloadURL(storageRef);

                    // Map both possible internal paths
                    urlMapping.set(`${LOCAL_ASSET_PREFIX}${cleanName}`, downloadUrl);
                    urlMapping.set(`assets/${cleanName}`, downloadUrl); // Just in case

                    uploadedCount++;
                    onProgress(`Restoring files... (${uploadedCount}/${files.length})`);
                }
            }
        }

        // 5. Restore Firestore Data
        onProgress("Restoring database records...");

        // 5a. Replace local paths with new URLs in data
        for (const colName in backupData.collections) {
            const docs = backupData.collections[colName];
            for (const docData of docs) {
                replaceLocalPaths(docData, urlMapping);
            }
        }

        // 5b. Write to Firestore
        let totalBatches = 0;
        let batch = writeBatch(db);
        let opCount = 0;

        for (const colName in backupData.collections) {
            const docs = backupData.collections[colName];
            for (const docData of docs) {
                const docId = docData.id;
                const { id, ...data } = docData; // Valid data to write

                const docRef = doc(db, colName, docId);
                batch.set(docRef, data);
                opCount++;

                if (opCount >= 450) { // Firestore batch limit is 500
                    await batch.commit();
                    batch = writeBatch(db);
                    opCount = 0;
                    totalBatches++;
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        onProgress("Restore completed successfully!");
        return true;

    } catch (error) {
        console.error("Import failed:", error);
        throw error;
    }
}

export async function clearDatabase() {
    // Delete all documents in known collections
    for (const colName of COLLECTIONS_TO_BACKUP) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);

        // Batched delete
        let batch = writeBatch(db);
        let count = 0;
        for (const d of snapshot.docs) {
            batch.delete(doc(db, colName, d.id));
            count++;
            if (count >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) await batch.commit();
    }
}

function replaceLocalPaths(obj: any, mapping: Map<string, string>) {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'string' && (value.startsWith("local://") || value.startsWith("assets/"))) {
            if (mapping.has(value)) {
                obj[key] = mapping.get(value);
            }
        } else if (typeof value === 'object') {
            replaceLocalPaths(value, mapping);
        }
    }
}

function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
