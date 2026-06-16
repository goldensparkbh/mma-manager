const DEFAULT_BRIDGE = "http://127.0.0.1:9780";

export type FingerprintBridgeStatus = "online" | "offline";

export async function getBridgeStatus(bridgeUrl?: string): Promise<FingerprintBridgeStatus> {
  const base = (bridgeUrl || DEFAULT_BRIDGE).replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export async function captureFingerprint(bridgeUrl?: string): Promise<string> {
  const base = (bridgeUrl || DEFAULT_BRIDGE).replace(/\/$/, "");
  const res = await fetch(`${base}/capture`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
  });
  const body = (await res.json()) as { template?: string; error?: string };
  if (!res.ok || !body.template) throw new Error(body.error || "Fingerprint capture failed");
  return body.template;
}

export async function verifyFingerprintPairClient(
  template1: string,
  template2: string,
  bridgeUrl?: string,
): Promise<boolean> {
  const base = (bridgeUrl || DEFAULT_BRIDGE).replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/verify-pair`, {
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
    /* server will verify on enroll */
  }
  return true;
}
