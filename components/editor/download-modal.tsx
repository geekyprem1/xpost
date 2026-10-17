"use client";

import { useRef, useState } from "react";
import {
  Copy,
  Download,
  Loader2,
  ImageIcon,
  Sparkles,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  exportFilename,
  type ExportFormat,
  type ExportScale,
} from "@/lib/renderer/export";
import {
  ExportCancelledError,
  startGifExport,
  startImageExport,
  startVideoExport,
  type ExportHandle,
  type ExportProgress,
} from "@/lib/renderer/export-client";
import { GIF_MAX_FRAMES, GIF_MAX_HEIGHT } from "@/lib/renderer/export-gif";
import {
  VIDEO_BITRATE,
  VIDEO_FPS,
  VIDEO_MAX_HEIGHT,
  VIDEO_MAX_WIDTH,
} from "@/lib/renderer/export-video";
import {
  xPresetSummary,
  type ExportPresetKind,
} from "@/lib/renderer/x-presets";
import { useEditorStore } from "@/lib/store";

const TYPES = [
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "gif", label: "GIF", icon: Sparkles },
  { id: "video", label: "Video", icon: Film },
] as const;

type ExportType = (typeof TYPES)[number]["id"];

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "png", label: "PNG" },
  { id: "jpg", label: "JPG" },
  { id: "webp", label: "WebP" },
];

const SCALES: ExportScale[] = [1, 2, 3];

const PHASE_LABELS: Record<ExportProgress["phase"], string> = {
  assets: "Preparing assets",
  init: "Initializing renderer",
  decode: "Decoding video",
  render: "render",
  encode: "encode",
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function DownloadModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const scene = useEditorStore((state) => state.scene);
  const imageElement = useEditorStore((state) => state.imageElement);
  const setScene = useEditorStore((state) => state.setScene);
  const [type, setType] = useState<ExportType>("image");
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState<ExportScale>(2);
  const [gifWidth, setGifWidth] = useState(480);
  const [gifLength, setGifLength] = useState(5);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [via, setVia] = useState<"worker" | "main" | null>(null);
  const handleRef = useRef<ExportHandle | null>(null);

  const motionAvailable = scene.background.kind === "video";

  async function runHandle(
    kind: ExportPresetKind,
    create: () => ExportHandle,
  ): Promise<{ blob: Blob; width: number; height: number; ms: number } | null> {
    setBusy(true);
    setError(null);
    setStatus(null);
    setVia(null);
    setProgress(null);
    const handle = create();
    handleRef.current = handle;
    try {
      const result = await handle.promise;
      const preset = xPresetSummary(kind, {
        width: result.width,
        height: result.height,
        bytes: result.blob.size,
        frames: result.frames,
        durationSeconds: result.durationSeconds,
      });
      setStatus(
        `${result.width} × ${result.height} · ${formatBytes(result.blob.size)} · ${(
          result.ms / 1000
        ).toFixed(2)}s · ${preset}`,
      );
      setVia(result.via);
      return result;
    } catch (reason) {
      if (reason instanceof ExportCancelledError) {
        setStatus("Export cancelled.");
        return null;
      }
      setError(reason instanceof Error ? reason.message : String(reason));
      return null;
    } finally {
      handleRef.current = null;
      setProgress(null);
      setBusy(false);
    }
  }

  function runImageExport(exportFormat: ExportFormat) {
    return runHandle("image", () =>
      startImageExport(
        scene,
        { screenshot: imageElement },
        { format: exportFormat, scale },
        { onProgress: setProgress },
      ),
    );
  }

  function runVideoExport() {
    return runHandle("video", () =>
      startVideoExport(
        scene,
        { screenshot: imageElement },
        {
          fps: VIDEO_FPS,
          maxWidth: VIDEO_MAX_WIDTH,
          maxHeight: VIDEO_MAX_HEIGHT,
          bitrate: VIDEO_BITRATE,
        },
        { onProgress: setProgress },
      ),
    );
  }

  function runGifExport() {
    return runHandle("gif", () =>
      startGifExport(
        scene,
        { screenshot: imageElement },
        {
          fps: 12,
          maxWidth: gifWidth,
          durationSeconds: gifLength,
          maxHeight: GIF_MAX_HEIGHT,
          maxFrames: GIF_MAX_FRAMES,
        },
        { onProgress: setProgress },
      ),
    );
  }

  async function onDownload() {
    const result =
      type === "video"
        ? await runVideoExport()
        : type === "gif"
          ? await runGifExport()
          : await runImageExport(format);
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFilename(
      type === "video" ? "mp4" : type === "gif" ? "gif" : format,
    );
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function onCopy() {
    const result = await runImageExport("png");
    if (!result) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": result.blob }),
      ]);
      setStatus(`Copied to clipboard — ${result.width} × ${result.height}`);
    } catch {
      setError("Copy failed. Check your browser clipboard permissions.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-label="Download"
        className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl p-6"
      >
        <DialogHeader>
          <DialogTitle>Download</DialogTitle>
          <DialogDescription>
            {type === "gif"
              ? `${gifWidth}px wide · ${gifLength}s`
              : "Choose a file type, format and scale."}
          </DialogDescription>
        </DialogHeader>
        <div className="border-border mt-4 space-y-5 border-t pt-5">
          <div className="space-y-1">
            <span className="text-xs font-medium">Type</span>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  size="sm"
                  className="h-16 flex-col gap-1 rounded-xl"
                  variant={type === option.id ? "secondary" : "outline"}
                  aria-pressed={type === option.id}
                  disabled={busy || (option.id !== "image" && !motionAvailable)}
                  onClick={() => {
                    setType(option.id);
                    setError(null);
                    setStatus(null);
                  }}
                >
                  <option.icon className="size-4" aria-hidden />
                  {option.label}
                </Button>
              ))}
            </div>
            {!motionAvailable ? (
              <p className="text-muted-foreground text-[11px]">
                GIF and video need a motion background
              </p>
            ) : null}
          </div>

          {type === "gif" ? (
            <>
              <fieldset disabled={busy} className="space-y-2">
                <legend className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                  Width
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {[480, 640].map((width) => (
                    <Button
                      key={width}
                      type="button"
                      className="h-11 rounded-xl"
                      variant={gifWidth === width ? "secondary" : "outline"}
                      aria-pressed={gifWidth === width}
                      onClick={() => setGifWidth(width)}
                    >
                      {width}px
                    </Button>
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={busy} className="space-y-2">
                <legend className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                  Length
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 8].map((seconds) => (
                    <Button
                      key={seconds}
                      type="button"
                      className="h-11 rounded-xl"
                      variant={gifLength === seconds ? "secondary" : "outline"}
                      aria-pressed={gifLength === seconds}
                      onClick={() => setGifLength(seconds)}
                    >
                      {seconds}s
                    </Button>
                  ))}
                </div>
              </fieldset>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Creates your GIF at 12 fps in your browser. Smaller widths and
                shorter lengths export faster.
              </p>
            </>
          ) : null}

          {type === "image" ? (
            <>
              <div className="space-y-1">
                <span className="text-xs font-medium">Format</span>
                <div className="flex gap-1">
                  {FORMATS.map((option) => (
                    <Button
                      key={option.id}
                      type="button"
                      size="sm"
                      variant={format === option.id ? "secondary" : "outline"}
                      aria-pressed={format === option.id}
                      onClick={() => setFormat(option.id)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium">Scale</span>
                <div className="flex gap-1">
                  {SCALES.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      size="sm"
                      variant={scale === option ? "secondary" : "outline"}
                      aria-pressed={scale === option}
                      onClick={() => setScale(option)}
                    >
                      {option}×
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Watermark</span>
            <Button
              type="button"
              size="sm"
              variant={scene.watermark ? "secondary" : "outline"}
              aria-pressed={scene.watermark}
              onClick={() =>
                setScene((current) => ({
                  ...current,
                  watermark: !current.watermark,
                }))
              }
            >
              {scene.watermark ? "On" : "Off"}
            </Button>
          </div>

          {busy ? (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Exporting
              {progress ? ` — ${PHASE_LABELS[progress.phase]}` : ""}
              {progress?.frame && progress.total
                ? ` · ${Math.round((progress.frame / progress.total) * 100)}% (${progress.frame}/${progress.total})`
                : ""}
              …
            </p>
          ) : null}
          {status ? (
            <p
              className="text-muted-foreground text-xs"
              data-export-via={via ?? undefined}
            >
              {status}
            </p>
          ) : null}
          {error ? <p className="text-destructive text-xs">{error}</p> : null}

          <div className="flex gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => void onDownload()}
            >
              <Download aria-hidden />
              Download{" "}
              {type === "gif"
                ? "GIF"
                : type === "video"
                  ? "Video"
                  : format.toUpperCase()}
            </Button>
            {type === "image" ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void onCopy()}
              >
                <Copy aria-hidden />
                Copy PNG
              </Button>
            ) : null}
            {busy ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleRef.current?.cancel()}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
