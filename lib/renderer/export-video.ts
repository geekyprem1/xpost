export const VIDEO_MIN_SECONDS = 5;
export const VIDEO_MAX_SECONDS = 10;
export const VIDEO_FPS = 30;
export const VIDEO_MAX_WIDTH = 1280;
export const VIDEO_MAX_HEIGHT = 1024;
export const VIDEO_BITRATE = 6_000_000;

export function computeVideoDuration(sourceDuration: number): number {
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) {
    return VIDEO_MIN_SECONDS;
  }
  if (sourceDuration >= VIDEO_MIN_SECONDS) {
    return Math.min(sourceDuration, VIDEO_MAX_SECONDS);
  }
  return VIDEO_MIN_SECONDS;
}

export function buildLoopTimestamps(
  durationSeconds: number,
  fps: number,
  sourceDuration: number
): number[] {
  const frameCount = Math.max(1, Math.round(durationSeconds * fps));
  const loop =
    Number.isFinite(sourceDuration) && sourceDuration > 0
      ? sourceDuration
      : durationSeconds;
  const timestamps: number[] = [];
  for (let index = 0; index < frameCount; index++) {
    const time = index / fps;
    timestamps.push(loop >= durationSeconds ? time : time % loop);
  }
  return timestamps;
}

export function capVideoSize(
  size: { width: number; height: number },
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const scale = Math.min(
    1,
    maxWidth / Math.max(1, size.width),
    maxHeight / Math.max(1, size.height)
  );
  const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  return {
    width: even(size.width * scale),
    height: even(size.height * scale),
  };
}
