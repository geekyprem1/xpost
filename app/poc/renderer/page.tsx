"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GlPocRenderer } from "./gl-renderer";
import { GIF_TEST, MP4_TEST, POC_SCENE } from "./poc-scene";
import type { FrameProvider, TestResult } from "./media-tests";

type Thumb = { kind: "img" | "video"; url: string; label: string };

declare global {
  interface Window {
    __POC_RESULTS__?: {
      done: boolean;
      env: Record<string, unknown>;
      tests: TestResult[];
    };
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timeout (${ms}ms)`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${url}`));
    img.src = url;
  });
}

function waitVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("video load timeout")),
      20000,
    );
    video.addEventListener(
      "loadeddata",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    video.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        reject(new Error("video element error"));
      },
      { once: true },
    );
  });
}

export default function RendererPocPage() {
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const domRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<GlPocRenderer | null>(null);
  const resultsRef = useRef<TestResult[]>([]);
  const startedRef = useRef(false);
  const pausedRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, Thumb>>({});
  const [env, setEnv] = useState<Record<string, unknown>>({});
  const [running, setRunning] = useState(false);

  const add = useCallback((r: TestResult) => {
    resultsRef.current = [...resultsRef.current, r];
    setTests(resultsRef.current);
  }, []);

  const addThumb = useCallback((key: string, t: Thumb) => {
    setThumbs((prev) => ({ ...prev, [key]: t }));
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    resultsRef.current = [];
    setTests([]);
    pausedRef.current = true;

    const envInfo: Record<string, unknown> = {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      webgl2: false,
      videoEncoder: typeof VideoEncoder !== "undefined",
    };

    const finish = () => {
      setEnv(envInfo);
      window.__POC_RESULTS__ = {
        done: true,
        env: envInfo,
        tests: resultsRef.current,
      };
      pausedRef.current = false;
      setRunning(false);
    };

    try {
      const canvas = glCanvasRef.current;
      if (!canvas) throw new Error("GL canvas missing");
      if (!rendererRef.current) rendererRef.current = new GlPocRenderer(canvas);
      envInfo.webgl2 = true;
      add({
        id: "webgl2-init",
        label: "WebGL2 Initializing renderer (custom layer)",
        status: "pass",
      });
    } catch (e) {
      envInfo.webgl2 = false;
      add({
        id: "webgl2-init",
        label: "WebGL2 Initializing renderer (custom layer)",
        status: "fail",
        detail: msg(e),
      });
      finish();
      return;
    }
    const renderer = rendererRef.current;
    if (!renderer) {
      finish();
      return;
    }

    const {
      checkCodecSupport,
      createVideoFrameProvider,
      runGifTest,
      runVideoEncodeTest,
    } = await import("./media-tests");

    const codecs = await checkCodecSupport();
    codecs.forEach(add);
    const avcOk = codecs.some(
      (c) => c.id === "enc-h264" && c.status === "pass",
    );
    const vp8Ok = codecs.some((c) => c.id === "enc-vp8" && c.status === "pass");
    const decH264Ok = codecs.some(
      (c) => c.id === "dec-h264" && c.status === "pass",
    );

    try {
      const img = await loadImage(POC_SCENE.imageUrl);
      const probe = document.createElement("canvas");
      probe.width = 8;
      probe.height = 8;
      const pctx = probe.getContext("2d");
      if (!pctx) throw new Error("no probe context");
      pctx.drawImage(img, 0, 0, 8, 8);
      pctx.getImageData(0, 0, 8, 8);
      renderer.setScreenshot(img);
      add({
        id: "pexels-image-cors",
        label: "Pexels image CORS (draw + readback)",
        status: "pass",
        detail: `${img.naturalWidth}x${img.naturalHeight}`,
      });
    } catch (e) {
      add({
        id: "pexels-image-cors",
        label: "Pexels image CORS (draw + readback)",
        status: "fail",
        detail: msg(e),
      });
    }

    let videoReady = false;
    const videoEl = videoRef.current;
    if (videoEl) {
      try {
        await waitVideoReady(videoEl);
        await videoEl.play().catch(() => undefined);
        const probe = document.createElement("canvas");
        probe.width = 64;
        probe.height = 36;
        const pctx = probe.getContext("2d");
        if (!pctx) throw new Error("no probe context");
        pctx.drawImage(videoEl, 0, 0, 64, 36);
        pctx.getImageData(0, 0, 64, 36);
        videoReady = true;
        add({
          id: "pexels-video-cors",
          label: "Pexels video CORS (draw + readback)",
          status: "pass",
          detail: `${videoEl.videoWidth}x${videoEl.videoHeight}`,
        });
      } catch (e) {
        add({
          id: "pexels-video-cors",
          label: "Pexels video CORS (draw + readback)",
          status: "fail",
          detail: msg(e),
        });
      }
    }

    for (const scale of [2, 3]) {
      try {
        const res = await renderer.renderToBlob(scale, {
          background: "gradient",
          glass: true,
          tilt: true,
        });
        addThumb(`gl-${scale}`, {
          kind: "img",
          url: URL.createObjectURL(res.blob),
          label: `A WebGL2 ${scale}x — ${res.width}x${res.height}`,
        });
        add({
          id: `gl-png-${scale}x`,
          label: `A: WebGL2 PNG ${scale}x export`,
          status: "pass",
          ms: res.ms,
          detail: `${res.width}x${res.height} — ${(res.blob.size / 1024).toFixed(0)} KB`,
        });
      } catch (e) {
        add({
          id: `gl-png-${scale}x`,
          label: `A: WebGL2 PNG ${scale}x export`,
          status: "fail",
          detail: msg(e),
        });
      }
    }

    const domNode = domRef.current;
    if (domNode) {
      const { toCanvas } = await import("html-to-image");
      for (const pr of [2, 3]) {
        try {
          const t0 = performance.now();
          const c = await withTimeout(
            toCanvas(domNode, { pixelRatio: pr }),
            30000,
            "html-to-image",
          );
          const ms = performance.now() - t0;
          const blob = await new Promise<Blob>((resolve, reject) => {
            c.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("toBlob null"))),
              "image/png",
            );
          });
          addThumb(`dom-${pr}`, {
            kind: "img",
            url: URL.createObjectURL(blob),
            label: `B DOM ${pr}x — ${c.width}x${c.height}`,
          });
          add({
            id: `dom-png-${pr}x`,
            label: `B: DOM html-to-image PNG ${pr}x export`,
            status: "pass",
            ms,
            detail: `${c.width}x${c.height} — ${(blob.size / 1024).toFixed(0)} KB`,
          });
        } catch (e) {
          add({
            id: `dom-png-${pr}x`,
            label: `B: DOM html-to-image PNG ${pr}x export`,
            status: "fail",
            detail: msg(e),
          });
        }
      }
    }

    let provider: FrameProvider | null = null;
    if (videoReady && decH264Ok) {
      try {
        provider = await createVideoFrameProvider(
          POC_SCENE.videoUrl,
          MP4_TEST.width,
          MP4_TEST.height,
        );
        add({
          id: "frames-decode",
          label: "Mediabunny Decoding video (frame sampling)",
          status: "pass",
        });
      } catch (e) {
        add({
          id: "frames-decode",
          label: "Mediabunny Decoding video (frame sampling)",
          status: "fail",
          detail: msg(e),
        });
      }
    } else {
      add({
        id: "frames-decode",
        label: "Mediabunny Decoding video (frame sampling)",
        status: "skip",
        detail: decH264Ok
          ? "video not ready"
          : "H.264 decoding is unavailable in this browser. Using gradient frames.",
      });
    }

    const codec = avcOk ? "avc" : vp8Ok ? "vp8" : null;
    if (!codec) {
      add({
        id: "video-encode",
        label: "5s video encode (WebCodecs + Mediabunny)",
        status: "skip",
        detail: "No supported encoder found",
      });
    } else {
      try {
        const r = await runVideoEncodeTest({
          renderer,
          provider,
          codec,
          fps: MP4_TEST.fps,
          durationSec: MP4_TEST.durationSec,
          width: MP4_TEST.width,
          height: MP4_TEST.height,
          label: `5s ${codec === "avc" ? "MP4 (H.264)" : "WebM (VP8)"} — WebCodecs + Mediabunny`,
        });
        const { url, ...rest } = r;
        if (url) addThumb("video", { kind: "video", url, label: rest.label });
        add(rest);
      } catch (e) {
        add({
          id: "video-encode",
          label: `5s ${codec} encode`,
          status: "fail",
          detail: msg(e),
        });
      }
    }

    try {
      const r = await runGifTest({
        renderer,
        provider,
        fps: GIF_TEST.fps,
        durationSec: GIF_TEST.durationSec,
        width: GIF_TEST.width,
        height: GIF_TEST.height,
      });
      const { url, ...rest } = r;
      if (url) addThumb("gif", { kind: "img", url, label: rest.label });
      add(rest);
    } catch (e) {
      add({
        id: "gif",
        label: "GIF 5s (gifenc)",
        status: "fail",
        detail: msg(e),
      });
    }

    add({
      id: "note-x-preset",
      label: "X presets (POC render)",
      status: "pass",
      detail: `MP4 ${MP4_TEST.width}x${MP4_TEST.height} @${MP4_TEST.fps}fps (X: ≤1280x1024, 30fps) · GIF ${GIF_TEST.width}x${GIF_TEST.height} @${GIF_TEST.fps}fps (X: ≤1280x1080, ≤350 frames)`,
    });

    finish();
  }, [add, addThumb]);

  useEffect(() => {
    const loop = () => {
      const r = rendererRef.current;
      if (r && !pausedRef.current) {
        const v = videoRef.current;
        const ready = !!v && v.readyState >= 2;
        if (ready && v) r.setVideoFrame(v, v.videoWidth / v.videoHeight);
        r.render(1, {
          background: ready ? "video" : "gradient",
          glass: true,
          tilt: true,
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    if (!startedRef.current) {
      startedRef.current = true;
      void runAll();
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [runAll]);

  const gradient = `linear-gradient(${POC_SCENE.gradient.angle}deg, rgb(${POC_SCENE.gradient.from.join(",")}), rgb(${POC_SCENE.gradient.to.join(",")}))`;

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "ui-monospace, monospace",
        background: "#101014",
        color: "#e8e8ee",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>
        Shotlark Renderer POC — T1.5 (decision gate)
      </h1>
      <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
        A: custom WebGL2 layer · B: DOM + html-to-image · runs automatically on
        page load
      </p>
      <button
        onClick={() => void runAll()}
        disabled={running}
        style={{
          padding: "6px 14px",
          marginBottom: 16,
          background: "#2a2a36",
          color: "#e8e8ee",
          border: "1px solid #444",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {running ? "running…" : "Re-run all tests"}
      </button>

      <div
        style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}
      >
        <div>
          <h2 style={{ fontSize: 14, marginBottom: 6 }}>A — WebGL2 (custom)</h2>
          <canvas
            ref={glCanvasRef}
            width={1200}
            height={900}
            style={{ width: 480, height: 360, border: "1px solid #333" }}
          />
        </div>
        <div>
          <h2 style={{ fontSize: 14, marginBottom: 6 }}>
            B — DOM + html-to-image
          </h2>
          <div
            style={{
              width: 480,
              height: 360,
              overflow: "hidden",
              border: "1px solid #333",
            }}
          >
            <div
              style={{ transform: "scale(0.4)", transformOrigin: "top left" }}
            >
              <div
                ref={domRef}
                style={{
                  width: 1200,
                  height: 900,
                  position: "relative",
                  overflow: "hidden",
                  background: gradient,
                }}
              >
                <video
                  src={POC_SCENE.videoUrl}
                  muted
                  loop
                  autoPlay
                  playsInline
                  crossOrigin="anonymous"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) perspective(${POC_SCENE.tilt.cameraDist}px) rotateX(${POC_SCENE.tilt.x}deg) rotateY(${POC_SCENE.tilt.y}deg)`,
                  }}
                >
                  <div
                    style={{
                      width: 820,
                      height: 630,
                      borderRadius: 46,
                      background: "rgba(255,255,255,0.18)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      border: "1px solid rgba(255,255,255,0.35)",
                      boxShadow: "0 26px 70px rgba(0,0,0,0.42)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={POC_SCENE.imageUrl}
                      crossOrigin="anonymous"
                      alt=""
                      style={{
                        width: 760,
                        height: 570,
                        borderRadius: 28,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <video
        ref={videoRef}
        src={POC_SCENE.videoUrl}
        muted
        loop
        playsInline
        crossOrigin="anonymous"
        style={{
          position: "fixed",
          left: -50,
          top: -50,
          width: 2,
          height: 2,
          opacity: 0.01,
          pointerEvents: "none",
        }}
      />

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, marginBottom: 6 }}>Results</h2>
        <table
          style={{
            fontSize: 12,
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: 980,
          }}
        >
          <tbody>
            {tests.map((t, i) => (
              <tr
                key={`${t.id}-${i}`}
                style={{ borderBottom: "1px solid #26262e" }}
              >
                <td
                  style={{
                    padding: "4px 8px",
                    color:
                      t.status === "pass"
                        ? "#5ddb7d"
                        : t.status === "fail"
                          ? "#ff6b6b"
                          : "#d9c26a",
                  }}
                >
                  {t.status}
                </td>
                <td style={{ padding: "4px 8px" }}>{t.label}</td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>
                  {t.ms !== undefined ? `${Math.round(t.ms)} ms` : ""}
                </td>
                <td style={{ padding: "4px 8px", opacity: 0.8 }}>
                  {t.detail ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, marginBottom: 6 }}>Export artifacts</h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {Object.entries(thumbs).map(([key, t]) => (
            <figure key={key} style={{ margin: 0, maxWidth: 280 }}>
              {t.kind === "img" ? (
                <img
                  src={t.url}
                  alt={t.label}
                  style={{
                    maxWidth: 280,
                    display: "block",
                    border: "1px solid #333",
                  }}
                />
              ) : (
                <video
                  src={t.url}
                  controls
                  muted
                  style={{
                    maxWidth: 280,
                    display: "block",
                    border: "1px solid #333",
                  }}
                />
              )}
              <figcaption style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                {t.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, marginBottom: 6 }}>Env</h2>
        <pre
          style={{
            fontSize: 11,
            opacity: 0.8,
            whiteSpace: "pre-wrap",
            maxWidth: 980,
          }}
        >
          {JSON.stringify(env, null, 2)}
        </pre>
      </section>
    </main>
  );
}
