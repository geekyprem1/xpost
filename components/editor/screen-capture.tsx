"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadImageFromFile, MAX_IMAGE_BYTES } from "@/lib/image/load";
import { useEditorStore } from "@/lib/store";

type Point = { x: number; y: number };
type Region = { x: number; y: number; width: number; height: number };

export function ScreenCapture() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const startRef = useRef<Point | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);

  function stopCapture() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }
  function close() {
    requestRef.current++;
    stopCapture();
    setOpen(false);
    setSnapshot(null);
    setRegion(null);
    setBusy(false);
  }
  useEffect(
    () => () => {
      requestRef.current++;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function capture() {
    if (busy) return;
    const request = ++requestRef.current;
    setError(null);
    setBusy(true);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setOpen(true);
      setError(
        "Screen capture is unavailable in this browser. Use desktop Chrome or Edge, or paste a screenshot with Ctrl+V / Command+V.",
      );
      setBusy(false);
      return;
    }
    const video = document.createElement("video");
    let ownedStream: MediaStream | null = null;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      ownedStream = stream;
      streamRef.current = stream;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new Error(
                "The screen did not provide a frame. Please try again.",
              ),
            ),
          8000,
        );
        const done = () => {
          clearTimeout(timer);
          resolve();
        };
        if (typeof video.requestVideoFrameCallback === "function")
          video.requestVideoFrameCallback(done);
        else if (video.readyState >= 2) done();
        else video.addEventListener("loadeddata", done, { once: true });
      });
      if (request !== requestRef.current) return;
      if (!video.videoWidth || !video.videoHeight)
        throw new Error("The selected screen could not be captured.");
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to capture the screen.");
      context.drawImage(video, 0, 0);
      setSnapshot(canvas.toDataURL("image/png"));
      setRegion(null);
      setOpen(true);
    } catch (reason) {
      if (request !== requestRef.current) return;
      if (reason instanceof DOMException && reason.name === "NotAllowedError")
        return;
      setOpen(true);
      setError(
        reason instanceof Error
          ? reason.message
          : "Screen capture failed. Please try again.",
      );
    } finally {
      video.pause();
      video.srcObject = null;
      ownedStream?.getTracks().forEach((track) => track.stop());
      if (streamRef.current === ownedStream) streamRef.current = null;
      if (request === requestRef.current) setBusy(false);
    }
  }

  function point(clientX: number, clientY: number): Point {
    const bounds = imageRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height)),
    };
  }

  async function openCaptureInCanvas(full = false) {
    const image = imageRef.current;
    if (!image || busy) return;
    const crop = full ? { x: 0, y: 0, width: 1, height: 1 } : region;
    if (!crop || crop.width <= 0 || crop.height <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const x = Math.floor(crop.x * image.naturalWidth);
      const y = Math.floor(crop.y * image.naturalHeight);
      const width = Math.max(
        1,
        Math.min(
          image.naturalWidth - x,
          Math.round(crop.width * image.naturalWidth),
        ),
      );
      const height = Math.max(
        1,
        Math.min(
          image.naturalHeight - y,
          Math.round(crop.height * image.naturalHeight),
        ),
      );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to crop the screenshot.");
      context.drawImage(image, x, y, width, height, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(new Error("Unable to save the screenshot.")),
          "image/png",
        ),
      );
      if (blob.size > MAX_IMAGE_BYTES)
        throw new Error("This capture exceeds 10 MB. Select a smaller area.");
      const file = new File([blob], "screen-capture-" + Date.now() + ".png", {
        type: "image/png",
      });
      const loaded = await loadImageFromFile(file);
      useEditorStore.getState().setImage(loaded.element, loaded.url, file.name);
      close();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to open this capture.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label="Capture screen"
        title="Capture screen and select an area"
        disabled={busy}
        onClick={() => void capture()}
      >
        {busy ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <ScanLine aria-hidden />
        )}
        <span className="tool-label">Capture</span>
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogContent className="max-h-[94dvh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto rounded-2xl">
          <DialogTitle>Select your screenshot area</DialogTitle>
          <DialogDescription>
            Drag across the captured screen to select an area, then open it in
            the canvas. Screen sharing has stopped.
          </DialogDescription>
          {snapshot ? (
            <div className="bg-muted/30 mt-4 flex justify-center rounded-xl p-2">
              <div
                className="relative inline-block max-w-full overflow-hidden rounded-lg leading-none"
                style={{ touchAction: "none" }}
                onPointerDown={(event) => {
                  if (busy || event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  startRef.current = point(event.clientX, event.clientY);
                  setRegion(null);
                }}
                onPointerMove={(event) => {
                  if (!startRef.current || busy) return;
                  const end = point(event.clientX, event.clientY),
                    start = startRef.current;
                  setRegion({
                    x: Math.min(start.x, end.x),
                    y: Math.min(start.y, end.y),
                    width: Math.abs(end.x - start.x),
                    height: Math.abs(end.y - start.y),
                  });
                }}
                onPointerUp={() => {
                  startRef.current = null;
                }}
                onPointerCancel={() => {
                  startRef.current = null;
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={snapshot}
                  alt="Captured screen. Drag to crop, or use the full screenshot."
                  draggable={false}
                  className="block max-h-[60dvh] max-w-full cursor-crosshair select-none"
                />
                {region ? (
                  <div
                    className="pointer-events-none absolute border-2 border-violet-400 bg-violet-400/5"
                    style={{
                      left: region.x * 100 + "%",
                      top: region.y * 100 + "%",
                      width: region.width * 100 + "%",
                      height: region.height * 100 + "%",
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                    }}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-destructive mt-3 text-sm">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => void capture()}
              disabled={busy}
            >
              Capture again
            </Button>
            {snapshot ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => void openCaptureInCanvas(true)}
                  disabled={busy}
                >
                  Use full screenshot
                </Button>
                <Button
                  onClick={() => void openCaptureInCanvas()}
                  disabled={
                    busy ||
                    !region ||
                    region.width < 0.002 ||
                    region.height < 0.002
                  }
                >
                  {busy ? "Opening…" : "Open selection in canvas"}
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
