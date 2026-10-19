import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { findMeshPreset } from "@/lib/backgrounds/presets";
import type { Look } from "@/lib/looks/looks";
import type { AspectId, FrameId, Scene } from "@/lib/scene";
import { DesktopMock, MobileMock, TerminalMock } from "./mock-screens";

/**
 * CSS approximation of how a look renders in the editor, for marketing cards.
 * The real output comes from the WebGL renderer; this only needs to read as
 * the same composition at thumbnail size.
 */

const ASPECT_RATIO: Partial<Record<AspectId, string>> = {
  "16:10": "16 / 10",
  "16:9": "16 / 9",
  "4:5": "4 / 5",
  "1:1": "1 / 1",
  "9:16": "9 / 16",
};

type Device = {
  src: string;
  width: number;
  height: number;
  screen: { x: number; y: number; w: number; h: number };
  kind: "laptop" | "phone";
};

// Screen openings from public/frames/*.json.
const DEVICES: Partial<Record<FrameId, Device>> = {
  "macbook-pro-14": {
    src: "/frames/macbook-pro-14.png",
    width: 3824,
    height: 2564,
    screen: { x: 400, y: 300, w: 3024, h: 1964 },
    kind: "laptop",
  },
  "macbook-pro-16": {
    src: "/frames/macbook-pro-16.png",
    width: 4256,
    height: 2834,
    screen: { x: 400, y: 300, w: 3456, h: 2234 },
    kind: "laptop",
  },
  "iphone-18-pro": {
    src: "/frames/iphone-pro.png",
    width: 1406,
    height: 2822,
    screen: { x: 100, y: 100, w: 1206, h: 2622 },
    kind: "phone",
  },
  "iphone-18-pro-max": {
    src: "/frames/iphone-pro-max.png",
    width: 1520,
    height: 3068,
    screen: { x: 100, y: 100, w: 1320, h: 2868 },
    kind: "phone",
  },
  "iphone-17": {
    src: "/frames/iphone-17.png",
    width: 1379,
    height: 2756,
    screen: { x: 100, y: 100, w: 1179, h: 2556 },
    kind: "phone",
  },
  "iphone-air": {
    src: "/frames/iphone-air.png",
    width: 1490,
    height: 2996,
    screen: { x: 100, y: 100, w: 1290, h: 2796 },
    kind: "phone",
  },
};

type WindowChrome = {
  bar: string;
  body: string;
  border: string;
  pill?: string;
  accent?: string;
  hasBar: boolean;
};

// Colors from lib/renderer/frames.json.
const WINDOWS: Partial<Record<FrameId, WindowChrome>> = {
  browser: {
    bar: "#1c1c23",
    body: "#141419",
    border: "#2e2e38",
    pill: "#26262e",
    hasBar: true,
  },
  safari: {
    bar: "#f4f4f6",
    body: "#ffffff",
    border: "#d6d6de",
    pill: "#e6e6ec",
    hasBar: true,
  },
  arc: {
    bar: "#232329",
    body: "#141419",
    border: "#34343d",
    pill: "#2e2e37",
    accent: "#8b5cf6",
    hasBar: true,
  },
  terminal: {
    bar: "#15151b",
    body: "#0d0d12",
    border: "#2c2c34",
    hasBar: true,
  },
  glass: {
    bar: "rgba(255,255,255,0.14)",
    body: "rgba(18,18,24,0.55)",
    border: "rgba(255,255,255,0.38)",
    pill: "rgba(255,255,255,0.2)",
    hasBar: true,
  },
  "dark-bar": {
    bar: "#0c0c11",
    body: "#101015",
    border: "#28282f",
    hasBar: true,
  },
  card: { bar: "#18181e", body: "#18181e", border: "#32323c", hasBar: false },
};

function backgroundStyle(background: Scene["background"]): CSSProperties {
  switch (background.kind) {
    case "solid":
      return { backgroundColor: background.color };
    case "gradient":
      return {
        backgroundImage: `linear-gradient(${background.angle}deg, ${background.stops
          .map((stop) => `${stop.color} ${Math.round(stop.at * 100)}%`)
          .join(", ")})`,
      };
    case "mesh": {
      const preset = findMeshPreset(background.presetId);
      if (!preset) return { backgroundColor: "#15121e" };
      return {
        backgroundColor: preset.base,
        backgroundImage: preset.blobs
          .map(
            (blob) =>
              `radial-gradient(${Math.round(blob.radius * 150)}% ${Math.round(blob.radius * 150)}% at ${Math.round(blob.x * 100)}% ${Math.round(blob.y * 100)}%, ${blob.color} 0%, transparent 70%)`,
          )
          .join(", "),
      };
    }
    default:
      return { backgroundColor: "#15121e" };
  }
}

function Sunlight({ look }: { look: Look }) {
  if (!look.sunlight) return null;
  const opacity = look.sunlight.strength / 100;
  if (look.sunlight.overlay === "blinds") {
    return (
      <div
        className="pointer-events-none absolute inset-0 mix-blend-multiply blur-[2px]"
        style={{
          opacity,
          backgroundImage:
            "repeating-linear-gradient(118deg, transparent 0 7%, rgba(40,24,10,0.45) 7% 11%)",
        }}
      />
    );
  }
  return (
    <div
      className="pointer-events-none absolute inset-0 mix-blend-multiply blur-[6px]"
      style={{
        opacity,
        backgroundImage:
          "linear-gradient(125deg, transparent 0 30%, rgba(60,36,12,0.4) 30% 36%, transparent 36% 58%, rgba(60,36,12,0.4) 58% 64%, transparent 64%)",
      }}
    />
  );
}

function screenshotFor(look: Look): ReactNode {
  if (look.frame === "terminal") return <TerminalMock />;
  return <DesktopMock />;
}

function DeviceArt({ device, look }: { device: Device; look: Look }) {
  const { screen } = device;
  const sizing: CSSProperties =
    device.kind === "laptop"
      ? { width: "86%", aspectRatio: `${device.width} / ${device.height}` }
      : { height: "84%", aspectRatio: `${device.width} / ${device.height}` };
  return (
    <div className="relative" style={sizing}>
      <div
        className={`absolute overflow-hidden ${device.kind === "phone" ? "rounded-[13%/6.2%]" : ""}`}
        style={{
          left: `${(screen.x / device.width) * 100}%`,
          top: `${(screen.y / device.height) * 100}%`,
          width: `${(screen.w / device.width) * 100}%`,
          height: `${(screen.h / device.height) * 100}%`,
        }}
      >
        {device.kind === "phone" ? <MobileMock /> : screenshotFor(look)}
      </div>
      <Image
        src={device.src}
        alt=""
        fill
        sizes="(min-width: 1024px) 480px, 80vw"
        className="pointer-events-none object-contain select-none"
      />
    </div>
  );
}

function WindowArt({ chrome, look }: { chrome: WindowChrome; look: Look }) {
  return (
    <div
      className="@container w-[80%] overflow-hidden rounded-[1.6cqw] border shadow-[0_30px_60px_-20px_rgba(10,6,30,0.55)]"
      style={{
        backgroundColor: chrome.body,
        borderColor: chrome.border,
        backdropFilter: look.frame === "glass" ? "blur(12px)" : undefined,
      }}
    >
      {chrome.hasBar ? (
        <div
          className="flex h-[5cqw] items-center gap-[1cqw] px-[2cqw]"
          style={{ backgroundColor: chrome.bar }}
        >
          <span className="size-[1.3cqw] rounded-full bg-[#ff5f57]" />
          <span className="size-[1.3cqw] rounded-full bg-[#febc2e]" />
          <span className="size-[1.3cqw] rounded-full bg-[#28c840]" />
          {chrome.pill ? (
            <span
              className="mx-auto h-[2.6cqw] w-[38%] rounded-full"
              style={{ backgroundColor: chrome.pill }}
            />
          ) : null}
          {chrome.accent ? (
            <span
              className="h-[2.6cqw] w-[8%] rounded-full"
              style={{ backgroundColor: chrome.accent }}
            />
          ) : null}
        </div>
      ) : null}
      <div
        className="aspect-[16/10] overflow-hidden"
        style={{
          margin: chrome.hasBar ? "0 1.2cqw 1.2cqw" : "1.4cqw",
          borderRadius: "0.9cqw",
        }}
      >
        {screenshotFor(look)}
      </div>
    </div>
  );
}

function ScreenshotArt({ look }: { look: Look }) {
  const tall = look.aspect === "9:16";
  const radius =
    look.style?.corner === "round" ? "rounded-[5%]" : "rounded-[3%]";
  return (
    <div
      className={`overflow-hidden ${radius} shadow-[0_30px_60px_-18px_rgba(10,6,30,0.6)] ${tall ? "aspect-[9/17] w-[76%]" : "aspect-[16/11] w-[78%]"}`}
    >
      {tall ? <MobileMock /> : <DesktopMock />}
    </div>
  );
}

export function LookPreview({
  look,
  playing = false,
  className = "",
  priority = false,
}: {
  look: Look;
  /** Plays the motion background (video looks only). */
  playing?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const device = DEVICES[look.frame];
  const chrome = WINDOWS[look.frame];
  const { tiltX = 0, tiltY = 0 } = look.transform ?? {};
  const video = look.background.kind === "video" ? look.background.src : null;

  return (
    <div
      aria-hidden
      className={`relative isolate overflow-hidden ${className}`}
      style={{
        aspectRatio: ASPECT_RATIO[look.aspect] ?? "16 / 10",
        ...backgroundStyle(look.background),
      }}
    >
      {video?.previewUrl ? (
        <Image
          src={video.previewUrl}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 480px, 80vw"
          className="-z-10 object-cover"
        />
      ) : null}
      {video && playing ? (
        <video
          src={video.url}
          className="absolute inset-0 -z-10 size-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        />
      ) : null}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={
          tiltX || tiltY
            ? {
                transform: `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
              }
            : undefined
        }
      >
        {device ? (
          <DeviceArt device={device} look={look} />
        ) : chrome ? (
          <WindowArt chrome={chrome} look={look} />
        ) : (
          <ScreenshotArt look={look} />
        )}
      </div>
      {/* Light falls across the device too, like the editor's overlay. */}
      <Sunlight look={look} />
    </div>
  );
}
