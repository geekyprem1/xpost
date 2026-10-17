import { FONTS } from "@/lib/fonts";
import type { TextLayer } from "@/lib/scene";

export type MeasureText = (text: string) => number;

export type TextLayoutLine = {
  text: string;
  width: number;
};

export type TextLayout = {
  lines: TextLayoutLine[];
  widthPx: number;
  heightPx: number;
  fontPx: number;
  paddingPx: number;
  lineHeightPx: number;
};

export function textFontCss(layer: TextLayer, scale: number): string {
  const font = FONTS[layer.style.font];
  return `${layer.style.weight} ${layer.style.size * scale}px "${font.family}", sans-serif`;
}

/**
 * Greedy word wrap. Long words are broken by character so text never
 * overflows the box. Injected measure keeps this testable without canvas.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: MeasureText,
): string[] {
  const limit = Math.max(1, maxWidth);
  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= limit) {
        line = candidate;
        continue;
      }

      if (line) {
        lines.push(line);
        line = "";
      }

      if (measure(word) <= limit) {
        line = word;
        continue;
      }

      let chunk = "";
      for (const character of Array.from(word)) {
        const next = chunk + character;
        if (chunk && measure(next) > limit) {
          lines.push(chunk);
          chunk = character;
        } else {
          chunk = next;
        }
      }
      line = chunk;
    }

    if (line) lines.push(line);
  }

  return lines.length > 0 ? lines : [""];
}

export function layoutText(
  layer: TextLayer,
  options: { widthPx: number; scale: number; measure: MeasureText },
): TextLayout {
  const fontPx = layer.style.size * options.scale;
  const paddingPx = (layer.style.background?.padding ?? 0) * options.scale;
  const widthPx = Math.max(1, options.widthPx);
  const wrapWidth = Math.max(1, widthPx - paddingPx * 2);
  const lines = wrapText(layer.text, wrapWidth, options.measure).map(
    (text) => ({
      text,
      width: options.measure(text),
    }),
  );
  const lineHeightPx = fontPx * layer.style.lineHeight;
  const heightPx = Math.max(1, lines.length) * lineHeightPx + paddingPx * 2;

  return {
    lines,
    widthPx,
    heightPx,
    fontPx,
    paddingPx,
    lineHeightPx,
  };
}
