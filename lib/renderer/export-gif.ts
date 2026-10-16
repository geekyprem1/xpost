export const GIF_FPS = 15;
export const GIF_MAX_WIDTH = 1280;
export const GIF_MAX_HEIGHT = 1080;
export const GIF_MAX_FRAMES = 350;

export function gifFrameDelayMs(fps: number): number {
  return Math.max(10, Math.round(1000 / Math.max(1, fps)));
}
