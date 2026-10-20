export const GIF_FPS = 15;
export const GIF_MAX_WIDTH = 1280;
export const GIF_MAX_HEIGHT = 1080;
export const GIF_MAX_FRAMES = 350;
/** Width options in the download modal (5s at 960px measured ~4 MB). */
export const GIF_WIDTHS = [640, 800, 960] as const;
export const GIF_DEFAULT_WIDTH = 800;
/** Crossfade that hides the jump where the GIF loops back to its start. */
export const GIF_LOOP_FADE_SECONDS = 0.5;
/** Frames sampled (from the start of the loop) to build the shared palette. */
export const GIF_PALETTE_WARMUP_FRAMES = 8;

export function gifFrameDelayMs(fps: number): number {
  return Math.max(10, Math.round(1000 / Math.max(1, fps)));
}
