import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";

type Props = {
  onScan: (token: string) => void;
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

export function QrScanner({ onScan, active = true }: Props) {
  const { t } = useLanguage();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    handledRef.current = false;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          if (handledRef.current) return;
          const token = extractToken(text);
          if (!token) return;
          handledRef.current = true;
          onScan(token);
        },
        () => {},
      )
      .then(() => setStarting(false))
      .catch((err) => {
        setStarting(false);
        setError((err as Error).message || t("checkin.cameraError"));
      });

    return () => {
      scanner.stop().catch(() => {}).finally(() => {
        try {
          scanner.clear();
        } catch {
          // ignore cleanup errors
        }
      });
      scannerRef.current = null;
    };
  }, [active, onScan, t]);

  return (
    <div className="space-y-3">
      <div id="qr-reader" className="w-full overflow-hidden rounded-lg border bg-black/5" />
      {starting && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("checkin.startingCamera")}
        </div>
      )}
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
