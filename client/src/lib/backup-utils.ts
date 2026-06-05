import { saveAs } from "file-saver";
import { apiJson, apiFetch } from "./api";

export async function exportFullDatabase(onProgress?: (status: string) => void) {
  onProgress?.("Exporting data...");
  const data = await apiJson<Record<string, unknown>>("/api/backup/export");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  saveAs(blob, `club-backup-${new Date().toISOString().split("T")[0]}.json`);
  onProgress?.("Export complete");
}

export async function importFullDatabase(
  jsonFile: File,
  _zipFile: File | null,
  onProgress?: (status: string) => void,
) {
  onProgress?.("Reading backup file...");
  const text = await jsonFile.text();
  const json = JSON.parse(text);
  onProgress?.("Importing data...");
  await apiJson("/api/backup/import", { method: "POST", body: JSON.stringify(json) });
  onProgress?.("Import complete");
}

export async function clearDatabase(onProgress?: (status: string) => void) {
  onProgress?.("Clearing database...");
  await apiFetch("/api/backup/clear", { method: "POST" });
  onProgress?.("Database cleared");
}
