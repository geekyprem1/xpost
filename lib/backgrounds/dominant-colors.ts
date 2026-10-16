export type PixelSource = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export function extractDominantColors(source: PixelSource, count = 4): string[] {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  const { data } = source;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }

  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  const picked: { r: number; g: number; b: number }[] = [];
  for (const bucket of sorted) {
    const r = Math.round(bucket.r / bucket.n);
    const g = Math.round(bucket.g / bucket.n);
    const b = Math.round(bucket.b / bucket.n);
    const isDuplicate = picked.some(
      (existing) =>
        Math.abs(existing.r - r) + Math.abs(existing.g - g) + Math.abs(existing.b - b) < 60
    );
    if (!isDuplicate) picked.push({ r, g, b });
    if (picked.length >= count) break;
  }

  picked.sort(
    (a, b) =>
      0.2126 * a.r + 0.7152 * a.g + 0.0722 * a.b -
      (0.2126 * b.r + 0.7152 * b.g + 0.0722 * b.b)
  );

  return picked.map(
    ({ r, g, b }) =>
      `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`
  );
}
