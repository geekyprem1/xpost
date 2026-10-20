import { GIFEncoder, quantize } from "gifenc";

/**
 * GIF encoding core used by the export worker. Pure (no DOM), so it runs in
 * a worker and in tests.
 *
 * Compared with quantizing every frame on its own, this:
 * - uses one palette for the whole loop (no frame-to-frame color flicker),
 *   rebuilding it only if a later frame drifts too far from it;
 * - can apply ordered (Bayer) dithering, which smooths gradient banding and
 *   stays identical on static pixels from frame to frame;
 * - writes pixels that did not change as transparent, so the static
 *   screenshot is stored once instead of in every frame.
 */

export type Rgb = [number, number, number];

/** Real colors per palette; one more slot is reserved for transparency. */
const PALETTE_COLORS = 255;
/** Pixels sampled to build a palette. */
const PALETTE_SAMPLES = 400_000;
/** Unchanged runs shorter than this stay opaque (speckles compress worse). */
const MIN_TRANSPARENT_RUN = 4;
/** Ordered dithering amplitude, in 0–255 channel units. */
const DITHER_STRENGTH = 12;
/**
 * Pixels this close (squared RGB distance) to a palette color are not
 * dithered, so flat UI colors stay clean and only gradients get the pattern.
 */
const DITHER_MIN_ERROR = 3 * 2 * 2;
/** Every Nth pixel is used to measure palette error. */
const ERROR_STRIDE = 17;
/** Frames averaged for the baseline palette error. */
const BASELINE_FRAMES = 4;
/** Minimum frames between two palette rebuilds. */
const MIN_REFRESH_GAP = 6;

// 8×8 Bayer matrix, mapped to signed offsets in [-strength/2, strength/2).
const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
];
const DITHER_OFFSETS = Int8Array.from(BAYER_8, (value) =>
  Math.round((value / 64 - 0.5) * DITHER_STRENGTH),
);

const SAMPLE_STRIDES = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41];

/** Builds a palette from pixels sampled across `frames`. */
export function buildPalette(
  frames: ArrayLike<number>[],
  maxColors = PALETTE_COLORS,
): Rgb[] {
  const totalPixels = frames.reduce((sum, frame) => sum + frame.length / 4, 0);
  const wanted = Math.max(1, totalPixels / PALETTE_SAMPLES);
  // Prime strides avoid always landing on the same image columns.
  const stride =
    SAMPLE_STRIDES.find((value) => value >= wanted) ??
    SAMPLE_STRIDES[SAMPLE_STRIDES.length - 1];
  const sample = new Uint8ClampedArray(
    Math.ceil(totalPixels / stride + frames.length) * 4,
  );
  let offset = 0;
  for (const frame of frames) {
    for (let pixel = 0; pixel < frame.length; pixel += stride * 4) {
      sample[offset++] = frame[pixel];
      sample[offset++] = frame[pixel + 1];
      sample[offset++] = frame[pixel + 2];
      sample[offset++] = 255;
    }
  }
  const palette = quantize(sample.subarray(0, offset), maxColors, {
    format: "rgb565",
  });
  return palette.map((color) => [color[0], color[1], color[2]] as Rgb);
}

/** Maps RGBA pixels to palette indices, optionally with ordered dithering. */
export class PaletteMapper {
  readonly colors: Rgb[];
  /** Palette written to the GIF: the colors plus a transparent slot. */
  readonly table: Rgb[];
  readonly transparentIndex: number;
  // Nearest color per RGB565 bucket. Persists across frames, so a color
  // always maps to the same index (keeps static pixels stable).
  private readonly cache = new Int16Array(65536).fill(-1);

  constructor(colors: Rgb[]) {
    if (colors.length === 0 || colors.length > PALETTE_COLORS)
      throw new Error("Palette must have 1–255 colors");
    this.colors = colors;
    this.transparentIndex = colors.length;
    this.table = [...colors, [0, 0, 0]];
  }

  private nearest(key: number): number {
    const cached = this.cache[key];
    if (cached >= 0) return cached;
    // Bucket center, so the result never depends on which pixel came first.
    const r = ((key >> 11) << 3) | 4;
    const g = (((key >> 5) & 63) << 2) | 2;
    const b = ((key & 31) << 3) | 4;
    let best = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < this.colors.length; index++) {
      const color = this.colors[index];
      const dr = color[0] - r;
      const dg = color[1] - g;
      const db = color[2] - b;
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    this.cache[key] = best;
    return best;
  }

  /**
   * Fills `out` with palette indices and returns the mean squared error
   * (sampled) between the source pixels and their palette colors.
   */
  map(
    rgba: ArrayLike<number>,
    width: number,
    out: Uint8Array,
    dither: boolean,
  ): number {
    const cache = this.cache;
    let error = 0;
    let samples = 0;
    let nextSample = 0;
    const pixels = out.length;
    const colors = this.colors;
    for (let pixel = 0, x = 0, y = 0; pixel < pixels; pixel++) {
      const base = pixel * 4;
      const r = rgba[base];
      const g = rgba[base + 1];
      const b = rgba[base + 2];
      const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
      const cached = cache[key];
      let index = cached >= 0 ? cached : this.nearest(key);
      let color = colors[index];
      let dr = color[0] - r;
      let dg = color[1] - g;
      let db = color[2] - b;
      let distance = dr * dr + dg * dg + db * db;
      if (dither && distance > DITHER_MIN_ERROR) {
        const offset = DITHER_OFFSETS[((y & 7) << 3) | (x & 7)];
        let dr2 = r + offset;
        let dg2 = g + offset;
        let db2 = b + offset;
        dr2 = dr2 < 0 ? 0 : dr2 > 255 ? 255 : dr2;
        dg2 = dg2 < 0 ? 0 : dg2 > 255 ? 255 : dg2;
        db2 = db2 < 0 ? 0 : db2 > 255 ? 255 : db2;
        const ditherKey = ((dr2 >> 3) << 11) | ((dg2 >> 2) << 5) | (db2 >> 3);
        const ditherCached = cache[ditherKey];
        index = ditherCached >= 0 ? ditherCached : this.nearest(ditherKey);
        if (pixel === nextSample) {
          color = colors[index];
          dr = color[0] - r;
          dg = color[1] - g;
          db = color[2] - b;
          distance = dr * dr + dg * dg + db * db;
        }
      }
      out[pixel] = index;
      if (pixel === nextSample) {
        nextSample += ERROR_STRIDE;
        error += distance;
        samples++;
      }
      if (++x === width) {
        x = 0;
        y++;
      }
    }
    return samples > 0 ? error / samples : 0;
  }
}

/**
 * Replaces pixels that match the previous frame with the transparent index
 * (runs of at least `minRun` only). Returns the number of opaque pixels.
 */
export function diffFrame(
  indices: Uint8Array,
  previous: Uint8Array,
  transparentIndex: number,
  out: Uint8Array,
  minRun = MIN_TRANSPARENT_RUN,
): number {
  const length = indices.length;
  let opaque = 0;
  let pixel = 0;
  while (pixel < length) {
    if (indices[pixel] !== previous[pixel]) {
      out[pixel] = indices[pixel];
      opaque++;
      pixel++;
      continue;
    }
    let end = pixel + 1;
    while (end < length && indices[end] === previous[end]) end++;
    if (end - pixel >= minRun) {
      out.fill(transparentIndex, pixel, end);
    } else {
      for (let index = pixel; index < end; index++) out[index] = indices[index];
      opaque += end - pixel;
    }
    pixel = end;
  }
  return opaque;
}

/** In place: `target = target × (1 − weight) + other × weight`. */
export function blendInto(
  target: Uint8ClampedArray,
  other: ArrayLike<number>,
  weight: number,
): void {
  const keep = 1 - weight;
  for (let index = 0; index < target.length; index++) {
    target[index] = target[index] * keep + other[index] * weight;
  }
}

export type GifFramePlan = {
  /** Source times to decode, in order (output frames + crossfade frames). */
  timestamps: number[];
  /** Frames written to the GIF. */
  outputFrames: number;
  /** Frames crossfaded into the start of the loop (0 = none). */
  fadeFrames: number;
};

/**
 * Plans a seamless loop. The GIF starts `fadeFrames` into the clip; its last
 * `fadeFrames` blend from the clip's continuation into the clip's first
 * frames, so the last GIF frame leads straight into the first one.
 *
 * Decoded frame k (k < fadeFrames) is head frame k. Decoded frame k ≥
 * fadeFrames is output frame k − fadeFrames; the last fadeFrames output
 * frames are blended with head frame j at weight `crossfadeWeight(j)`.
 */
export function planGifFrames(input: {
  durationSeconds: number;
  fps: number;
  sourceDuration: number;
  fadeSeconds: number;
  maxFrames: number;
}): GifFramePlan {
  const fps = Math.max(1, input.fps);
  const outputFrames = Math.max(
    1,
    Math.min(input.maxFrames, Math.round(input.durationSeconds * fps)),
  );
  const source = input.sourceDuration;
  const sourceKnown = Number.isFinite(source) && source > 0;
  const length = outputFrames / fps;
  // A GIF spanning whole source loops already joins up seamlessly.
  const wholeLoops =
    sourceKnown &&
    length >= source - 1 / fps &&
    Math.abs(length / source - Math.round(length / source)) * source < 1 / fps;
  const fadeFrames = wholeLoops
    ? 0
    : Math.min(
        Math.floor(outputFrames / 4),
        Math.max(0, Math.round(input.fadeSeconds * fps)),
      );
  const timestamps: number[] = [];
  for (let frame = 0; frame < outputFrames + fadeFrames; frame++) {
    const time = frame / fps;
    timestamps.push(sourceKnown && time >= source ? time % source : time);
  }
  return { timestamps, outputFrames, fadeFrames };
}

/** Weight of head frame j in crossfade frame j: rises to exactly 1. */
export function crossfadeWeight(j: number, fadeFrames: number): number {
  return (j + 1) / fadeFrames;
}

export type GifEncodeTimings = { palette: number; map: number; lzw: number };

/**
 * Streams RGBA frames into a GIF with one shared palette, optional dithering
 * and transparent frame diffing. Call `setPalette` before the first frame.
 */
export class GifStreamEncoder {
  readonly timings: GifEncodeTimings = { palette: 0, map: 0, lzw: 0 };
  /** Times the palette was rebuilt because colors drifted. */
  paletteRebuilds = 0;

  private readonly gif = GIFEncoder();
  private readonly width: number;
  private readonly height: number;
  private readonly delay: number;
  private readonly dither: boolean;
  private mapper: PaletteMapper | null = null;
  private indices: Uint8Array;
  private previous: Uint8Array;
  private diffed: Uint8Array;
  private frames = 0;
  private usesLocalPalette = false;
  private forceFullFrame = true;
  private baseline: number | null = null;
  private baselineSum = 0;
  private baselineCount = 0;
  private lastRebuild = -Infinity;

  constructor(options: {
    width: number;
    height: number;
    delayMs: number;
    dither: boolean;
  }) {
    this.width = options.width;
    this.height = options.height;
    this.delay = options.delayMs;
    this.dither = options.dither;
    const pixels = options.width * options.height;
    this.indices = new Uint8Array(pixels);
    this.previous = new Uint8Array(pixels);
    this.diffed = new Uint8Array(pixels);
  }

  get frameCount(): number {
    return this.frames;
  }

  setPalette(colors: Rgb[]): void {
    this.mapper = new PaletteMapper(colors);
  }

  buildPaletteFrom(frames: ArrayLike<number>[]): void {
    const started = performance.now();
    this.setPalette(buildPalette(frames));
    this.timings.palette += performance.now() - started;
  }

  writeFrame(rgba: ArrayLike<number>): void {
    if (!this.mapper) throw new Error("GIF palette is not set");
    let started = performance.now();
    let error = this.mapper.map(rgba, this.width, this.indices, this.dither);

    if (this.baseline === null) {
      this.baselineSum += error;
      this.baselineCount++;
      if (this.baselineCount >= BASELINE_FRAMES)
        this.baseline = this.baselineSum / this.baselineCount;
    } else if (
      error > this.baseline * 2.2 + 12 &&
      this.frames - this.lastRebuild >= MIN_REFRESH_GAP
    ) {
      // Colors drifted (e.g. a hue-shifting background): rebuild from this
      // frame and switch to a local palette from here on.
      this.timings.map += performance.now() - started;
      this.buildPaletteFrom([rgba]);
      started = performance.now();
      error = this.mapper.map(rgba, this.width, this.indices, this.dither);
      this.baseline = error;
      this.lastRebuild = this.frames;
      this.paletteRebuilds++;
      this.usesLocalPalette = true;
      this.forceFullFrame = true;
    }

    const mapper = this.mapper;
    const full = this.forceFullFrame || this.frames === 0;
    if (!full) {
      diffFrame(
        this.indices,
        this.previous,
        mapper.transparentIndex,
        this.diffed,
      );
    }
    this.timings.map += performance.now() - started;

    started = performance.now();
    const first = this.frames === 0;
    this.gif.writeFrame(
      full ? this.indices : this.diffed,
      this.width,
      this.height,
      {
        palette: first || this.usesLocalPalette ? mapper.table : undefined,
        delay: this.delay,
        // Keep the previous frame on screen under transparent pixels.
        dispose: 1,
        ...(first ? { repeat: 0 } : {}),
        ...(full
          ? {}
          : { transparent: true, transparentIndex: mapper.transparentIndex }),
      },
    );
    this.timings.lzw += performance.now() - started;

    // Swap buffers: the indices just written become "previous".
    const swap = this.previous;
    this.previous = this.indices;
    this.indices = swap;
    this.forceFullFrame = false;
    this.frames++;
  }

  finish(): Uint8Array {
    const started = performance.now();
    this.gif.finish();
    this.timings.lzw += performance.now() - started;
    return this.gif.bytes();
  }
}
