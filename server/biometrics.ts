import { query } from "./db/index.js";
import { toCamelCase, rowsToCamel } from "./utils.js";
import {
  DEFAULT_ATTENDANCE_METHODS,
  parseAttendanceMethods,
  type AttendanceMethodsConfig,
} from "../shared/attendanceMethods.js";

export type FaceDescriptor = number[];

export function euclideanDistance(a: FaceDescriptor, b: FaceDescriptor): number {
  if (a.length !== b.length || !a.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function averageDescriptors(a: FaceDescriptor, b: FaceDescriptor): FaceDescriptor {
  const len = Math.min(a.length, b.length);
  const out: number[] = [];
  for (let i = 0; i < len; i++) out.push((a[i]! + b[i]!) / 2);
  return out;
}

export function parseDescriptor(raw: unknown): FaceDescriptor | null {
  if (!Array.isArray(raw) || raw.length < 64) return null;
  const nums = raw.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return nums;
}

export type FaceMatchResult = {
  memberId: string;
  memberName: string;
  distance: number;
};

export function findBestFaceMatch(
  probe: FaceDescriptor,
  candidates: { memberId: string; memberName: string; descriptor: FaceDescriptor }[],
  threshold: number,
  minMargin: number,
): FaceMatchResult | null {
  const scored = candidates
    .map((c) => ({
      memberId: c.memberId,
      memberName: c.memberName,
      distance: Math.min(
        euclideanDistance(probe, c.descriptor),
        c.descriptor.length ? Infinity : Infinity,
      ),
    }))
    .sort((a, b) => a.distance - b.distance);

  if (!scored.length) return null;
  const best = scored[0]!;
  if (best.distance > threshold) return null;
  const second = scored[1];
  if (second && second.distance - best.distance < minMargin) return null;
  return best;
}

export async function getAttendanceMethods(tenantId: string): Promise<AttendanceMethodsConfig> {
  const result = await query(
    "SELECT attendance_methods FROM tenant_settings WHERE tenant_id = $1",
    [tenantId],
  );
  const raw = result.rows[0]?.attendance_methods;
  if (typeof raw === "string") {
    try {
      return parseAttendanceMethods(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_ATTENDANCE_METHODS };
    }
  }
  return parseAttendanceMethods(raw);
}

export async function updateAttendanceMethods(tenantId: string, config: AttendanceMethodsConfig) {
  const existing = await query("SELECT tenant_id FROM tenant_settings WHERE tenant_id = $1", [tenantId]);
  if (!existing.rows[0]) {
    await query("INSERT INTO tenant_settings (tenant_id) VALUES ($1)", [tenantId]);
  }
  await query(
    "UPDATE tenant_settings SET attendance_methods = $2, updated_at = NOW() WHERE tenant_id = $1",
    [tenantId, JSON.stringify(config)],
  );
  return config;
}

export async function getMemberBiometrics(tenantId: string, memberId: string) {
  const result = await query(
    "SELECT * FROM member_biometrics WHERE tenant_id = $1 AND member_id = $2",
    [tenantId, memberId],
  );
  if (!result.rows[0]) {
    return {
      memberId,
      hasFingerprint: false,
      hasFace: false,
      fingerprintEnrolledAt: null as string | null,
      faceEnrolledAt: null as string | null,
    };
  }
  const row = toCamelCase(result.rows[0]) as Record<string, unknown>;
  return {
    memberId,
    hasFingerprint: !!(row.fingerprintTemplate && row.fingerprintTemplateAlt),
    hasFace: !!(row.faceDescriptor && row.faceDescriptorAlt),
    fingerprintEnrolledAt: (row.fingerprintEnrolledAt as string) || null,
    faceEnrolledAt: (row.faceEnrolledAt as string) || null,
  };
}

export async function enrollMemberFace(
  tenantId: string,
  memberId: string,
  descriptor1: FaceDescriptor,
  descriptor2: FaceDescriptor,
  enrollmentThreshold = 0.45,
) {
  const d1 = parseDescriptor(descriptor1);
  const d2 = parseDescriptor(descriptor2);
  if (!d1 || !d2) throw new Error("Invalid face descriptors");
  const enrollDistance = euclideanDistance(d1, d2);
  if (enrollDistance > enrollmentThreshold) {
    throw new Error("The two face scans do not match. Please scan the same person twice.");
  }
  const averaged = averageDescriptors(d1, d2);
  await query(
    `INSERT INTO member_biometrics (tenant_id, member_id, face_descriptor, face_descriptor_alt, face_enrolled_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (member_id) DO UPDATE SET
       face_descriptor = $3, face_descriptor_alt = $4, face_enrolled_at = NOW(), updated_at = NOW()`,
    [tenantId, memberId, JSON.stringify(averaged), JSON.stringify(d2)],
  );
  return { ok: true, enrollDistance };
}

export async function enrollMemberFingerprint(
  tenantId: string,
  memberId: string,
  template1: string,
  template2: string,
  bridgeUrl?: string,
) {
  if (!template1?.trim() || !template2?.trim()) throw new Error("Both fingerprint scans are required");
  const verified = await verifyFingerprintPair(template1, template2, bridgeUrl);
  if (!verified) throw new Error("The two fingerprint scans do not match. Scan the same finger twice.");
  await query(
    `INSERT INTO member_biometrics (tenant_id, member_id, fingerprint_template, fingerprint_template_alt, fingerprint_enrolled_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (member_id) DO UPDATE SET
       fingerprint_template = $3, fingerprint_template_alt = $4, fingerprint_enrolled_at = NOW(), updated_at = NOW()`,
    [tenantId, memberId, template1.trim(), template2.trim()],
  );
  return { ok: true };
}

export async function clearMemberFace(tenantId: string, memberId: string) {
  await query(
    `UPDATE member_biometrics SET face_descriptor = NULL, face_descriptor_alt = NULL, face_enrolled_at = NULL, updated_at = NOW()
     WHERE tenant_id = $1 AND member_id = $2`,
    [tenantId, memberId],
  );
}

export async function clearMemberFingerprint(tenantId: string, memberId: string) {
  await query(
    `UPDATE member_biometrics SET fingerprint_template = NULL, fingerprint_template_alt = NULL, fingerprint_enrolled_at = NULL, updated_at = NOW()
     WHERE tenant_id = $1 AND member_id = $2`,
    [tenantId, memberId],
  );
}

export async function getEnrolledFaces(tenantId: string) {
  const result = await query(
    `SELECT mb.member_id, m.name AS member_name, mb.face_descriptor
     FROM member_biometrics mb
     JOIN members m ON m.id = mb.member_id AND m.tenant_id = mb.tenant_id
     WHERE mb.tenant_id = $1 AND mb.face_descriptor IS NOT NULL`,
    [tenantId],
  );
  return result.rows
    .map((row) => {
      const desc = parseDescriptor(row.face_descriptor);
      if (!desc) return null;
      return {
        memberId: row.member_id as string,
        memberName: row.member_name as string,
        descriptor: desc,
      };
    })
    .filter(Boolean) as { memberId: string; memberName: string; descriptor: FaceDescriptor }[];
}

export async function getEnrolledFingerprints(tenantId: string) {
  const result = await query(
    `SELECT mb.member_id, m.name AS member_name, mb.fingerprint_template, mb.fingerprint_template_alt
     FROM member_biometrics mb
     JOIN members m ON m.id = mb.member_id AND m.tenant_id = mb.tenant_id
     WHERE mb.tenant_id = $1 AND mb.fingerprint_template IS NOT NULL AND mb.fingerprint_template_alt IS NOT NULL`,
    [tenantId],
  );
  return rowsToCamel(result.rows) as {
    memberId: string;
    memberName: string;
    fingerprintTemplate: string;
    fingerprintTemplateAlt: string;
  }[];
}

function templateByteSimilarity(a: string, b: string): number {
  try {
    const ba = Buffer.from(a, "base64");
    const bb = Buffer.from(b, "base64");
    const len = Math.min(ba.length, bb.length);
    if (!len) return 0;
    let same = 0;
    for (let i = 0; i < len; i++) if (ba[i] === bb[i]) same++;
    return same / len;
  } catch {
    return a === b ? 1 : 0;
  }
}

export async function verifyFingerprintPair(
  template1: string,
  template2: string,
  bridgeUrl?: string,
): Promise<boolean> {
  if (bridgeUrl) {
    try {
      const res = await fetch(`${bridgeUrl.replace(/\/$/, "")}/verify-pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template1, template2 }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const body = (await res.json()) as { match?: boolean };
        return body.match === true;
      }
    } catch {
      /* fall through to local compare */
    }
  }
  return templateByteSimilarity(template1, template2) >= 0.85;
}

export async function matchFingerprintTemplate(
  probe: string,
  enrolled: { memberId: string; memberName: string; fingerprintTemplate: string; fingerprintTemplateAlt: string }[],
  bridgeUrl?: string,
): Promise<{ memberId: string; memberName: string; score: number } | null> {
  if (bridgeUrl) {
    try {
      const res = await fetch(`${bridgeUrl.replace(/\/$/, "")}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          probe,
          candidates: enrolled.map((e) => ({
            id: e.memberId,
            template: e.fingerprintTemplate,
            templateAlt: e.fingerprintTemplateAlt,
          })),
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const body = (await res.json()) as { memberId?: string; score?: number };
        if (body.memberId) {
          const hit = enrolled.find((e) => e.memberId === body.memberId);
          if (hit) return { memberId: hit.memberId, memberName: hit.memberName, score: body.score ?? 1 };
        }
        return null;
      }
    } catch {
      /* local fallback */
    }
  }

  let best: { memberId: string; memberName: string; score: number } | null = null;
  for (const e of enrolled) {
    const s1 = templateByteSimilarity(probe, e.fingerprintTemplate);
    const s2 = templateByteSimilarity(probe, e.fingerprintTemplateAlt);
    const score = Math.max(s1, s2);
    if (score >= 0.88 && (!best || score > best.score)) {
      best = { memberId: e.memberId, memberName: e.memberName, score };
    }
  }
  return best;
}

export async function matchFaceForTenant(
  tenantId: string,
  probe: FaceDescriptor,
  config: AttendanceMethodsConfig,
) {
  const enrolled = await getEnrolledFaces(tenantId);
  const threshold = config.faceMatchThreshold ?? DEFAULT_ATTENDANCE_METHODS.faceMatchThreshold!;
  const minMargin = config.faceMatchMinMargin ?? DEFAULT_ATTENDANCE_METHODS.faceMatchMinMargin!;
  return findBestFaceMatch(probe, enrolled, threshold, minMargin);
}

export async function matchFingerprintForTenant(
  tenantId: string,
  probe: string,
  config: AttendanceMethodsConfig,
) {
  const enrolled = await getEnrolledFingerprints(tenantId);
  return matchFingerprintTemplate(probe, enrolled, config.fingerprintBridgeUrl);
}
