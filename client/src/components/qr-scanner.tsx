import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";

type Props = {
  onScan: (token: string) => void;
  /** When false, stops the camera but keeps the DOM node for clean restart. */
  active?: boolean;
};

function extractToken(decoded: string): string | null {
  try {
    const url = new URL(decoded);
    const t = url.searchParams.get("t");
    if (t) return t;
  } catch {
    // not a URL
  }
  if (/^[a-f0-9]{32,}$/i.test(decoded.trim())) return decoded.trim();
  const match = decoded.match(/[?&]t=([a-f0-9]+)/i);
  return match?.[1] || null;
}

async function stopScannerSafely(scanner: Html5Qrcode) {
  try {
    const state = scanner.getState();
    if (
      state === Html5QrcodeScannerState.SCANNING ||
      state === Html5QrcodeScannerState.PAUSED
    ) {
      await scanner.stop();
    }
  } catch {
    // Scanner may already be stopped or DOM already removed
  }
  try {
    scanner.clear();
  } catch {
    // ignore
  }
}

export function QrScanner({ onScan, active = true }: Props) {
  const { t } = useLanguage();
  const elementId = useId().replace(/:/g, "");
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!active) {
      const existing = scannerRef.current;
      if (existing) {
        void stopScannerSafely(existing).finally(() => {
          scannerRef.current = null;
        });
      }
      return;
    }

    let disposed = false;
    let scanner: Html5Qrcode | null = null;
    setError("");
    setStarting(true);

    const start = async () => {
      scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            const token = extractToken(text);
            if (!token) return;
            onScanRef.current(token);
          },
          () => {},
        );
        if (!disposed) setStarting(false);
        else await stopScannerSafely(scanner);
      } catch (err) {
        if (!disposed) {
          setStarting(false);
          setError((err as Error).message || t("checkin.cameraError"));
        }
      }
    };

    void start();

    return () => {
      disposed = true;
      const s = scanner ?? scannerRef.current;
      scannerRef.current = null;
      if (s) void stopScannerSafely(s);
    };
  }, [active, elementId, t]);

  return (
    <div className="space-y-3">
      <div
        id={elementId}
        className={`w-full overflow-hidden rounded-lg border bg-black/5 ${!active ? "hidden" : ""}`}
      />
      {active && starting && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("checkin.startingCamera")}
        </div>
      )}
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
