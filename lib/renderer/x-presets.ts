export const X_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const X_GIF_MAX_WIDTH = 1280;
export const X_GIF_MAX_HEIGHT = 1080;
export const X_GIF_MAX_FRAMES = 350;
export const X_GIF_MAX_PIXELS = 300_000_000;
export const X_GIF_MAX_BYTES = 15 * 1024 * 1024;
export const X_MP4_MAX_WIDTH = 1280;
export const X_MP4_MAX_HEIGHT = 1024;
export const X_MP4_FPS = 30;
export const X_MP4_MIN_SECONDS = 5;
export const X_MP4_MAX_SECONDS = 10;

export type PresetCheck = { ok: boolean; issues: string[] };

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function checkImagePreset(bytes: number): PresetCheck {
  const issues: string[] = [];
  if (bytes > X_IMAGE_MAX_BYTES) {
    issues.push(`Exceeds 5 MB (${megabytes(bytes)})`);
  }
  return { ok: issues.length === 0, issues };
}

export function checkGifPreset(input: {
  width: number;
  height: number;
  frames: number;
  bytes: number;
}): PresetCheck {
  const issues: string[] = [];
  if (input.width > X_GIF_MAX_WIDTH || input.height > X_GIF_MAX_HEIGHT) {
    issues.push("Resolution exceeds 1280 x 1080");
  }
  if (input.frames > X_GIF_MAX_FRAMES) {
    issues.push(`${input.frames} frames > 350`);
  }
  if (input.width * input.height * input.frames > X_GIF_MAX_PIXELS) {
    issues.push("width × height × frames > 300M");
  }
  if (input.bytes > X_GIF_MAX_BYTES) {
    issues.push(`1Exceeds 5 MB (${megabytes(input.bytes)})`);
  }
  return { ok: issues.length === 0, issues };
}

export function checkMp4Preset(input: {
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  bytes?: number;
}): PresetCheck {
  const issues: string[] = [];
  if (input.width > X_MP4_MAX_WIDTH || input.height > X_MP4_MAX_HEIGHT) {
    issues.push("Resolution exceeds 1280 x 1024");
  }
  if (input.fps > X_MP4_FPS) {
    issues.push(`${input.fps} fps > 30`);
  }
  if (
    input.durationSeconds < X_MP4_MIN_SECONDS - 0.05 ||
    input.durationSeconds > X_MP4_MAX_SECONDS + 0.05
  ) {
    issues.push(`duration ${input.durationSeconds.toFixed(1)}s 5–10s ke bahar`);
  }
  const ratio =
    Math.max(input.width, input.height) /
    Math.max(1, Math.min(input.width, input.height));
  if (ratio > 3) {
    issues.push("aspect ratio 1:3–3:1 ke bahar");
  }
  return { ok: issues.length === 0, issues };
}

export type ImageAttempt = { scale: 1 | 2; quality: number };

export const X_IMAGE_ATTEMPTS: ImageAttempt[] = [
  { scale: 2, quality: 0.9 },
  { scale: 2, quality: 0.8 },
  { scale: 1, quality: 0.9 },
  { scale: 1, quality: 0.8 },
  { scale: 1, quality: 0.7 },
];

export async function encodeWithinLimit<T>(
  attempts: ImageAttempt[],
  limitBytes: number,
  encode: (attempt: ImageAttempt) => Promise<{ bytes: number; value: T }>,
): Promise<{ attempt: ImageAttempt; value: T; bytes: number } | null> {
  for (const attempt of attempts) {
    const result = await encode(attempt);
    if (result.bytes <= limitBytes) {
      return { attempt, value: result.value, bytes: result.bytes };
    }
  }
  return null;
}

export type ExportPresetKind = "image" | "gif" | "video";

export function xPresetSummary(
  kind: ExportPresetKind,
  result: {
    width: number;
    height: number;
    bytes: number;
    frames?: number;
    durationSeconds?: number;
  },
  mp4Fps: number = X_MP4_FPS,
): string {
  const check =
    kind === "image"
      ? checkImagePreset(result.bytes)
      : kind === "gif"
        ? checkGifPreset({
            width: result.width,
            height: result.height,
            frames: result.frames ?? 0,
            bytes: result.bytes,
          })
        : checkMp4Preset({
            width: result.width,
            height: result.height,
            fps: mp4Fps,
            durationSeconds: result.durationSeconds ?? 0,
            bytes: result.bytes,
          });
  return check.ok ? "X-ready ✓" : `X: ${check.issues[0]}`;
}
