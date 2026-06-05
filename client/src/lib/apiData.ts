import { apiJson, apiFetch } from "./api";
import type {
  Member, Subscription, Sale, Attendance, MemberBelt, SubscriptionPackage,
} from "@shared/schema";

export async function getSubscriptionsByMember(memberId: string): Promise<Subscription[]> {
  return apiJson(`/api/members/${memberId}/subscriptions`);
}

export async function getSalesByMember(memberId: string): Promise<Sale[]> {
  return apiJson(`/api/members/${memberId}/sales`);
}

export async function getAttendanceByMember(memberIdOrIds: string | string[]): Promise<Attendance[]> {
  const id = Array.isArray(memberIdOrIds) ? memberIdOrIds[0] : memberIdOrIds;
  return apiJson(`/api/members/${id}/attendance`);
}

export async function getAllAttendance(): Promise<Attendance[]> {
  return apiJson("/api/attendance/all");
}

export async function getSubscriptionPackages(): Promise<SubscriptionPackage[]> {
  return apiJson("/api/packages");
}

export async function getMemberBelts(memberId?: string): Promise<MemberBelt[]> {
  const url = memberId ? `/api/member-belts?memberId=${memberId}` : "/api/member-belts";
  return apiJson(url);
}

export async function createSubscription(data: Record<string, unknown>): Promise<Subscription> {
  return apiJson("/api/subscriptions", { method: "POST", body: JSON.stringify(data) });
}

export async function assignBeltToMember(data: Record<string, unknown>): Promise<MemberBelt> {
  return apiJson("/api/member-belts", { method: "POST", body: JSON.stringify(data) });
}

export async function revokeMemberBelt(id: string): Promise<void> {
  await apiFetch(`/api/member-belts/${id}`, { method: "DELETE" });
}

export async function payReceipt(receiptId: string, paymentMethod = "cash"): Promise<void> {
  await apiJson(`/api/sales/receipt/${receiptId}/pay`, {
    method: "POST",
    body: JSON.stringify({ paymentMethod }),
  });
}

export async function deleteReceipt(receiptId: string): Promise<void> {
  await apiFetch(`/api/sales/receipt/${receiptId}`, { method: "DELETE" });
}

export async function deleteSale(id: string): Promise<void> {
  await apiFetch(`/api/sales/${id}`, { method: "DELETE" });
}

export async function createAttendance(data: Record<string, unknown>): Promise<Attendance> {
  return apiJson("/api/attendance", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteAttendance(id: string): Promise<void> {
  await apiFetch(`/api/attendance/${id}`, { method: "DELETE" });
}

export async function deleteSubscription(id: string): Promise<void> {
  await apiFetch(`/api/subscriptions/${id}`, { method: "DELETE" });
}

export async function syncMemberSubscriptionStatus(memberId: string): Promise<void> {
  await apiJson(`/api/members/${memberId}/sync-subscription`, { method: "POST" });
}

export async function updateMemberDocuments(
  memberId: string,
  files: { file: File; label?: string }[],
): Promise<unknown[]> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f.file));
  const res = await apiFetch(`/api/members/${memberId}/documents`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function deleteMemberDocument(memberId: string, docName: string): Promise<void> {
  await apiJson(`/api/members/${memberId}/documents/${encodeURIComponent(docName)}`, { method: "DELETE" });
}

export async function createSale(data: Record<string, unknown>): Promise<Sale> {
  return apiJson("/api/sales", { method: "POST", body: JSON.stringify(data) });
}

export async function getBelts() {
  return apiJson("/api/belts");
}

export async function createBelt(data: Record<string, unknown>) {
  return apiJson("/api/belts", { method: "POST", body: JSON.stringify(data) });
}

export async function updateBelt(id: string, data: Record<string, unknown>) {
  await apiJson(`/api/belts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteBelt(id: string) {
  await apiFetch(`/api/belts/${id}`, { method: "DELETE" });
}
