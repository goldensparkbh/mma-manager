export type CheckInMethod = "qr" | "staff" | "fingerprint" | "face";

export interface AttendanceMethodsConfig {
  qr: boolean;
  staff: boolean;
  fingerprint: boolean;
  face: boolean;
  /** Local fingerprint reader service URL (club PC). */
  fingerprintBridgeUrl?: string;
  /** Max euclidean distance for face match (lower = stricter, twin-safe). Default 0.42 */
  faceMatchThreshold?: number;
  /** Min gap between 1st and 2nd best face match. Default 0.08 */
  faceMatchMinMargin?: number;
}

export const DEFAULT_ATTENDANCE_METHODS: AttendanceMethodsConfig = {
  qr: true,
  staff: true,
  fingerprint: false,
  face: false,
  fingerprintBridgeUrl: "http://127.0.0.1:9780",
  faceMatchThreshold: 0.42,
  faceMatchMinMargin: 0.08,
};

export function parseAttendanceMethods(raw: unknown): AttendanceMethodsConfig {
  const base = { ...DEFAULT_ATTENDANCE_METHODS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    qr: o.qr !== false,
    staff: o.staff !== false,
    fingerprint: o.fingerprint === true,
    face: o.face === true,
    fingerprintBridgeUrl:
      typeof o.fingerprintBridgeUrl === "string" && o.fingerprintBridgeUrl.trim()
        ? o.fingerprintBridgeUrl.trim()
        : base.fingerprintBridgeUrl,
    faceMatchThreshold:
      typeof o.faceMatchThreshold === "number" && o.faceMatchThreshold > 0
        ? o.faceMatchThreshold
        : base.faceMatchThreshold,
    faceMatchMinMargin:
      typeof o.faceMatchMinMargin === "number" && o.faceMatchMinMargin >= 0
        ? o.faceMatchMinMargin
        : base.faceMatchMinMargin,
  };
}
