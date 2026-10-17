"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasBuildAnimation } from "@/lib/hooks/use-canvas-build-animation";
import { ImagePlus } from "lucide-react";
import { IMAGE_ACCEPT } from "@/lib/image/load";
import { useImageActions } from "@/lib/image/use-image-actions";
import { createSunlightOverlayCanvas } from "@/lib/editor/sunlight-overlays";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import {
  computeOutputSize,
  createWatermarkCanvas,
  fitSize,
  WebGL2Renderer,
} from "@/lib/renderer";
import { useEditorStore } from "@/lib/store";

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rendererRef = useRef<WebGL2Renderer | null>(null);
  const lastUploadedRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const renderSceneRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(0);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const scene = useEditorStore((state) => state.scene);
  const imageElement = useEditorStore((state) => state.imageElement);
  const imageError = useEditorStore((state) => state.imageError);
  const setScene = useEditorStore((state) => state.setScene);
  const commitScene = useEditorStore((state) => state.commitScene);
  const hasImage = scene.image !== null;
  const { loadFile, loadFromDataTransfer } = useImageActions();
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: { x: number; y: number };
    displayWidth: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rendererRef.current) return;
    let disposed = false;
    const renderer = new WebGL2Renderer();
    renderer
      .init(canvas)
      .then(() => {
        if (disposed) return;
        // Publish only initialized instances. Readiness state can survive
        // effect replays during development while the renderer is recreated.
        rendererRef.current = renderer;
        lastUploadedRef.current = null;
        setError(null);
        setReady((value) => value + 1);
        void document.fonts.ready.then(() => {
          if (disposed) return;
          renderer.setAssets({ watermark: createWatermarkCanvas() });
          setReady((value) => value + 1);
        });
      })
      .catch((reason: unknown) => {
        if (disposed) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      disposed = true;
      if (rendererRef.current === renderer) {
        rendererRef.current = null;
        lastUploadedRef.current = null;
      }
      renderSceneRef.current = () => {};
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as {
        tagName?: unknown;
        isContentEditable?: unknown;
      } | null;
      if (
        target &&
        (target.isContentEditable === true ||
          (typeof target.tagName === "string" &&
            ["input", "textarea", "select"].includes(
              target.tagName.toLowerCase(),
            )))
      ) {
        return;
      }
      if (loadFromDataTransfer(event.clipboardData)) {
        event.preventDefault();
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadFromDataTransfer]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !ready) return;
    if (hasImage && imageElement) {
      if (lastUploadedRef.current !== imageElement) {
        renderer.setAssets({
          screenshot: imageElement,
          screenshotSize: {
            width: imageElement.naturalWidth,
            height: imageElement.naturalHeight,
          },
        });
        lastUploadedRef.current = imageElement;
      }
    } else if (lastUploadedRef.current) {
      renderer.setAssets({ screenshot: null, screenshotSize: null });
      lastUploadedRef.current = null;
    }
  }, [hasImage, imageElement, ready]);

  const overlayId = scene.sunlight.overlay;
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !ready) return;
    if (overlayId !== "none") {
      renderer.setAssets({
        sunlightOverlay: createSunlightOverlayCanvas(overlayId),
      });
    } else {
      renderer.setAssets({ sunlightOverlay: null });
    }
  }, [overlayId, ready]);

  const renderScene = useCallback(() => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    if (!renderer || !canvas || !ready || !size) return;
    const imageSize =
      hasImage && imageElement
        ? {
            width: imageElement.naturalWidth,
            height: imageElement.naturalHeight,
          }
        : null;
    const output = computeOutputSize(scene, 1, imageSize);
    const display = fitSize(
      { width: Math.max(1, size.width), height: Math.max(1, size.height) },
      output,
    );
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${Math.round(display.width)}px`;
    canvas.style.height = `${Math.round(display.height)}px`;
    const bufferWidth = Math.max(1, Math.round(display.width * dpr));
    try {
      renderer.render(scene, { scale: bufferWidth / scene.canvas.baseWidth });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      queueMicrotask(() => {
        if (rendererRef.current === renderer) setError(message);
      });
    }
  }, [scene, size, ready, hasImage, imageElement]);

  useEffect(() => {
    renderScene();
  }, [renderScene]);

  useEffect(() => {
    renderSceneRef.current = renderScene;
  }, [renderScene]);

  const background = scene.background;
  const backgroundImageUrl =
    background.kind === "image" ? background.src.url : null;
  const videoUrl = background.kind === "video" ? background.src.url : null;
  const videoPosterUrl =
    background.kind === "video" ? (background.src.previewUrl ?? null) : null;

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !ready) return;
    if (!backgroundImageUrl) {
      renderer.setAssets({ backgroundImage: null, backgroundAspect: null });
      renderSceneRef.current();
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled) return;
      renderer.setAssets({
        backgroundImage: image,
        backgroundAspect: image.naturalWidth / Math.max(1, image.naturalHeight),
      });
      renderSceneRef.current();
    };
    image.onerror = () => {
      if (!cancelled) setError("Unable to load the background image.");
    };
    image.src = backgroundImageUrl;
    return () => {
      cancelled = true;
    };
  }, [backgroundImageUrl, ready]);

  const reducedMotion = usePrefersReducedMotion();
  useCanvasBuildAnimation(
    canvasRef,
    containerRef,
    imageElement,
    ready,
    reducedMotion,
  );

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !ready || !videoUrl) {
      if (renderer && ready && !videoUrl) {
        renderer.setAssets({ videoFrame: null, videoAspect: null });
        renderSceneRef.current();
      }
      return;
    }
    let cancelled = false;

    if (videoPosterUrl) {
      const poster = new Image();
      poster.crossOrigin = "anonymous";
      poster.onload = () => {
        if (cancelled) return;
        const current = videoRef.current;
        if (current && current.readyState >= 2) return;
        renderer.setAssets({
          videoFrame: poster,
          videoAspect: poster.naturalWidth / Math.max(1, poster.naturalHeight),
        });
        renderSceneRef.current();
      };
      poster.src = videoPosterUrl;
    }

    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    videoRef.current = video;

    const upload = () => {
      if (cancelled || rendererRef.current !== renderer) return;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        renderer.setAssets({
          videoFrame: video,
          videoAspect: video.videoWidth / video.videoHeight,
        });
        renderSceneRef.current();
      }
    };
    video.addEventListener("loadeddata", upload);
    video.addEventListener("canplay", upload);
    if (reducedMotion) {
      video.currentTime = 0.001;
      video.addEventListener("seeked", upload);
    } else {
      void video.play().catch(() => undefined);
    }

    return () => {
      cancelled = true;
      video.pause();
      video.removeAttribute("src");
      video.load();
      videoRef.current = null;
      renderer.setAssets({ videoFrame: null, videoAspect: null });
    };
  }, [videoUrl, videoPosterUrl, ready, reducedMotion]);

  const motion = scene.background.kind === "video";

  useEffect(() => {
    if (!motion || reducedMotion) return;
    let raf = requestAnimationFrame(function tick() {
      if (!document.hidden) {
        const video = videoRef.current;
        const renderer = rendererRef.current;
        if (
          video &&
          renderer &&
          video.readyState >= 2 &&
          video.videoWidth > 0
        ) {
          renderer.setAssets({
            videoFrame: video,
            videoAspect: video.videoWidth / video.videoHeight,
          });
        }
        renderScene();
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [motion, reducedMotion, renderScene]);

  const output = computeOutputSize(
    scene,
    1,
    hasImage && imageElement
      ? { width: imageElement.naturalWidth, height: imageElement.naturalHeight }
      : null,
  );

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 w-full min-w-0 items-center justify-center"
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        loadFromDataTransfer(event.dataTransfer);
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Editor canvas"
        data-editor-preview="true"
        style={{
          touchAction: "none",
          visibility: hasImage ? "visible" : "hidden",
        }}
        className={
          dragActive
            ? "opacity-60"
            : hasImage
              ? "cursor-grab active:cursor-grabbing"
              : undefined
        }
        onPointerDown={(event) => {
          if (!hasImage) return;
          const bounds = canvasRef.current?.getBoundingClientRect();
          if (!bounds) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          const offset = useEditorStore.getState().scene.transform.offset;
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startOffset: { ...offset },
            displayWidth: bounds.width,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          const baseWidth = useEditorStore.getState().scene.canvas.baseWidth;
          const factor = baseWidth / Math.max(1, drag.displayWidth);
          const deltaX = (event.clientX - drag.startX) * factor;
          const deltaY = (event.clientY - drag.startY) * factor;
          setScene(
            (current) => ({
              ...current,
              transform: {
                ...current.transform,
                offset: {
                  x: drag.startOffset.x + deltaX,
                  y: drag.startOffset.y + deltaY,
                },
              },
            }),
            { transient: true },
          );
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          dragRef.current = null;
          commitScene();
        }}
        onPointerCancel={() => {
          if (dragRef.current) commitScene();
          dragRef.current = null;
        }}
        onLostPointerCapture={() => {
          if (dragRef.current) commitScene();
          dragRef.current = null;
        }}
      />
      {hasImage ? null : (
        <div className="welcome-screen pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-5">
          <div className="welcome-art" aria-hidden="true">
            <div className="art-orbit" />
            <div className="art-browser">
              <div className="art-browser-bar">
                <i />
                <i />
                <i />
                <span>your next big idea</span>
              </div>
              <div className="art-browser-content">
                <div className="art-label">THE BIG PICTURE</div>
                <strong>
                  Good work.
                  <br />
                  Beautifully framed.
                </strong>
                <div className="art-line" />
                <div className="art-line short" />
              </div>
            </div>
            <div className="art-phone">
              <div className="art-island" />
              <div className="art-phone-mark">
                <ImagePlus size={24} />
              </div>
              <span>
                Make it
                <br />
                <strong>yours.</strong>
              </span>
            </div>
            <span className="art-caption">
              A little framing. A big difference.
            </span>
          </div>
          <span className="welcome-eyebrow">YOUR CREATIVE WORKSPACE</span>
          <h2 className="welcome-title">
            Give your screenshot
            <br />
            the spotlight.
          </h2>
          <p className="welcome-description">
            Beautiful frames, moving backgrounds, and a post to match.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="empty-upload pointer-events-auto"
          >
            <ImagePlus size={18} aria-hidden />
            <span>Add a screenshot</span>
          </button>
          <p className="welcome-hint">
            Drop an image here or paste with <kbd>Ctrl / ⌘ V</kbd>
          </p>
          <span className="welcome-formats">
            PNG, JPG, WebP <span>·</span> Up to 10 MB
          </span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        data-testid="image-input"
        aria-hidden
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void loadFile(file);
          event.target.value = "";
        }}
      />
      {hasImage ? (
        <span className="bg-background/85 text-muted-foreground absolute top-0 left-0 rounded-full border px-3 py-1.5 font-mono text-[11px] shadow-sm backdrop-blur">
          {output.width} × {output.height}
        </span>
      ) : null}
      {imageError ? (
        <p className="text-destructive absolute inset-x-0 bottom-16 text-center text-sm">
          {imageError}
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive absolute inset-x-0 bottom-16 text-center text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
