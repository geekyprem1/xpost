"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { CloudUpload, ImageIcon, Loader2 } from "lucide-react";
import {
  IMAGE_ACCEPT,
  firstImageFromList,
  validateImageFile,
} from "@/lib/image/load";
import { useOpenInEditor } from "./open-in-editor";

/**
 * Hero upload card. The chosen screenshot is stored locally and the editor
 * picks it up after load (and after sign-in, if needed).
 */
export function HeroDropzone() {
  const { openWithImage } = useOpenInEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept(file: File) {
    if (busy) return;
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await openWithImage(file);
    } catch {
      setBusy(false);
      setError("Couldn't open that screenshot. Please try again.");
    }
  }

  const onPastedFile = useEffectEvent((file: File) => {
    void accept(file);
  });

  // Paste anywhere on the page (outside text fields).
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA")
      )
        return;
      const file = firstImageFromList(event.clipboardData?.files);
      if (!file) return;
      event.preventDefault();
      onPastedFile(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function onDragOver(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = firstImageFromList(event.dataTransfer.files);
    if (file) void accept(file);
    else setError("Only PNG, JPG and WebP files are supported.");
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDragging(false);
      }}
      onDrop={onDrop}
      className={`dropzone-card relative mx-auto w-full max-w-2xl rounded-[2rem] p-2 transition-transform duration-200 motion-reduce:transition-none ${dragging ? "scale-[1.015]" : ""}`}
      aria-busy={busy}
    >
      <div
        className={`flex flex-col items-center rounded-[1.6rem] border border-dashed px-6 py-12 text-center transition-colors sm:py-14 ${dragging ? "border-primary bg-primary/5" : "border-foreground/12"}`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="group focus-visible:outline-primary rounded-[1.4rem] p-1.5 focus-visible:outline-2 focus-visible:outline-offset-4"
          aria-describedby="dropzone-hint"
        >
          <span className="bg-foreground/5 border-foreground/10 inline-block rounded-[1.25rem] border p-2">
            <span className="bg-foreground text-background flex size-16 items-center justify-center rounded-2xl shadow-[0_12px_24px_-10px_rgba(0,0,0,0.55)] transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none">
              {busy ? (
                <Loader2 className="size-7 animate-spin" aria-hidden />
              ) : (
                <CloudUpload className="size-7" aria-hidden />
              )}
            </span>
          </span>
          <span className="mt-5 block text-xl font-semibold tracking-tight sm:text-2xl">
            {busy ? "Opening the editor..." : "Choose a screenshot"}
          </span>
        </button>
        <p id="dropzone-hint" className="text-muted-foreground mt-2 text-sm">
          Drop it here, paste with Ctrl/⌘ V, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="text-foreground decoration-foreground/30 hover:decoration-foreground font-medium underline underline-offset-4"
          >
            browse your files
          </button>
        </p>
        <span className="bg-background/70 border-foreground/10 text-muted-foreground mt-6 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
          <ImageIcon className="size-3.5" aria-hidden />
          PNG, JPG or WebP · up to 10 MB
        </span>
        {error ? (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {error}
          </p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = firstImageFromList(event.target.files);
            event.target.value = "";
            if (file) void accept(file);
          }}
        />
      </div>
    </div>
  );
}
