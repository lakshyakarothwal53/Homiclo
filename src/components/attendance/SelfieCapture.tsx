import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface SelfieResult {
  dataUrl: string;
  blob: Blob;
}

/**
 * Live selfie capture with a location/time watermark burned into the image.
 * Opens the front camera, lets the employee take one photo, stamps the
 * `watermark` lines onto the bottom of the frame (client-side canvas), and
 * hands the finished JPEG back to the parent via `onCapture`. Used on the
 * employee check-in page so attendance carries proof-of-presence.
 */
export function SelfieCapture({
  watermark,
  onCapture,
  disabled,
}: {
  watermark: string[];
  onCapture: (result: SelfieResult | null) => void;
  disabled?: boolean;
}) {
  const [streaming, setStreaming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Keep the latest watermark in a ref so capture() always stamps the current
  // coordinates without needing to be re-created on every location change.
  const watermarkRef = useRef(watermark);
  watermarkRef.current = watermark;

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }

  useEffect(() => stopStream, []);

  async function startCamera() {
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setStreaming(true);
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.play().catch(() => undefined);
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "UnknownError";
      console.error("[SelfieCapture] getUserMedia failed:", name, err);
      toast.error(`Camera unavailable (${name}). Please allow camera access and try again.`);
    } finally {
      setStarting(false);
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error("Camera not ready yet — give it a moment.");
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Could not capture the photo on this device.");
      return;
    }

    ctx.drawImage(video, 0, 0, w, h);
    drawWatermark(ctx, w, h, watermarkRef.current);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Could not encode the photo. Try again.");
          return;
        }
        setPreview(dataUrl);
        stopStream();
        onCapture({ dataUrl, blob });
      },
      "image/jpeg",
      0.85,
    );
  }

  function retake() {
    setPreview(null);
    onCapture(null);
    startCamera();
  }

  return (
    <div className="space-y-3">
      <div className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-black/90 text-sm text-muted-foreground">
        {preview ? (
          <img src={preview} alt="Attendance selfie" className="h-full w-full object-cover" />
        ) : streaming ? (
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Camera className="h-8 w-8" />
            <span>Camera preview</span>
          </div>
        )}
        {preview && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
            <Check className="h-3 w-3" /> Captured
          </span>
        )}
      </div>

      {preview ? (
        <Button type="button" variant="outline" className="w-full gap-2" onClick={retake}>
          <RefreshCw className="h-4 w-4" /> Retake Photo
        </Button>
      ) : streaming ? (
        <Button
          type="button"
          className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={capture}
        >
          <Camera className="h-4 w-4" /> Take Photo
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={startCamera}
          disabled={disabled || starting}
        >
          {starting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Opening Camera…
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" /> Capture Photo
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/** Draw a translucent bar with the watermark lines along the bottom edge. */
function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[]) {
  if (lines.length === 0) return;

  const pad = Math.round(w * 0.025);
  const fontSize = Math.max(12, Math.round(w * 0.028));
  const lineHeight = Math.round(fontSize * 1.35);
  const barHeight = lineHeight * lines.length + pad * 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, h - barHeight, w, barHeight);

  ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 3;
  lines.forEach((line, i) => {
    // First line (timestamp) rendered brighter/bolder as the header.
    ctx.fillStyle = i === 0 ? "#ffffff" : "rgba(255,255,255,0.9)";
    ctx.font =
      i === 0
        ? `600 ${fontSize}px system-ui, -apple-system, sans-serif`
        : `${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(line, pad, h - barHeight + pad + i * lineHeight);
  });
  ctx.shadowBlur = 0;
}
