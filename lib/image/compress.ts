export type Size = { width: number; height: number };

export function fitWithin(size: Size, max: number): Size {
  const scale = Math.min(1, max / Math.max(1, Math.max(size.width, size.height)));
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}
