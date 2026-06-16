import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { extractFaceDescriptor, loadFaceModels } from "@/lib/faceRecognition";

type Props = {
  onCapture: (descriptor: number[]) => void;
  disabled?: boolean;
  label?: string;
};

export function FaceCapture({ onCapture, disabled, label }: Props) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadFaceModels();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (e) {
        setError((e as Error).message || t("biometrics.cameraError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera, t]);

  const capture = async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);
    setError("");
    try {
      const descriptor = await extractFaceDescriptor(videoRef.current);
      if (!descriptor) throw new Error(t("biometrics.noFaceDetected"));
      onCapture(descriptor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] max-w-md mx-auto bg-muted rounded-lg overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        <video ref={videoRef} className="w-full h-full object-cover mirror" playsInline muted />
        <style>{`.mirror { transform: scaleX(-1); }`}</style>
      </div>
      {error ? <p className="text-sm text-destructive text-center">{error}</p> : null}
      <Button className="w-full" disabled={!ready || disabled || capturing} onClick={capture}>
        {capturing ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
        {label || t("biometrics.captureFace")}
      </Button>
    </div>
  );
}
